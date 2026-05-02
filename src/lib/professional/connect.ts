import "server-only";

import { buildAppUrl } from "@/lib/app-url";
import { coerceSupportedLocale } from "@/lib/locale-path";
import { stripe } from "@/lib/stripe/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type StartConnectOnboardingInput = {
  locale: string | null | undefined;
  preferredOrigin: string;
  profileId: string;
  userEmail?: string | null;
};

type SpecialistForConnect = {
  id: string;
  full_name: string;
  email: string | null;
  stripe_connect_id: string | null;
};

async function loadVerifiedSpecialist(profileId: string): Promise<SpecialistForConnect> {
  const { data: specialist, error } = await supabaseAdmin
    .from("specialists")
    .select("id, full_name, email, stripe_connect_id")
    .eq("profile_id", profileId)
    .eq("is_verified", true)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !specialist) {
    throw new Error(error?.message ?? "Unauthorized");
  }

  return specialist;
}

async function ensureConnectAccountId(specialist: SpecialistForConnect, fallbackEmail?: string | null) {
  if (specialist.stripe_connect_id) {
    return specialist.stripe_connect_id;
  }

  const account = await stripe.accounts.create({
    type: "express",
    country: "GB",
    email: specialist.email || fallbackEmail || undefined,
    business_type: "individual",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      name: specialist.full_name,
      product_description: "FairSettle professional referrals",
    },
  });

  await supabaseAdmin
    .from("specialists")
    .update({
      stripe_connect_id: account.id,
      stripe_connect_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", specialist.id);

  return account.id;
}

export async function createConnectOnboardingLink({
  locale,
  preferredOrigin,
  profileId,
  userEmail,
}: StartConnectOnboardingInput) {
  const safeLocale = coerceSupportedLocale(locale);
  const specialist = await loadVerifiedSpecialist(profileId);
  const connectAccountId = await ensureConnectAccountId(specialist, userEmail);

  return await stripe.accountLinks.create({
    account: connectAccountId,
    refresh_url: `${buildAppUrl("/api/professional/connect/refresh", safeLocale, preferredOrigin)}?locale=${encodeURIComponent(safeLocale)}`,
    return_url: `${buildAppUrl("/professional/profile", safeLocale, preferredOrigin)}?connect=return`,
    type: "account_onboarding",
  });
}
