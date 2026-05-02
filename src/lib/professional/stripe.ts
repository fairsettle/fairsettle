import "server-only";

import { stripe } from "@/lib/stripe/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type SpecialistStripeStatus = "not_started" | "pending" | "completed" | "restricted";

export type StripeStatusSnapshot = {
  status: SpecialistStripeStatus;
  detail: string | null;
  accountId: string | null;
};

function deriveStripeStatus(account: Awaited<ReturnType<typeof stripe.accounts.retrieve>>): StripeStatusSnapshot {
  const chargesEnabled = account.charges_enabled;
  const payoutsEnabled = account.payouts_enabled;
  const firstRequirementError = account.requirements?.errors?.[0]?.reason ?? null;
  const currentlyDueList = account.requirements?.currently_due ?? [];
  const pendingVerificationList = account.requirements?.pending_verification ?? [];
  const eventuallyDueList = account.requirements?.eventually_due ?? [];
  const currentlyDue = currentlyDueList.length
    ? `Additional Stripe details are still required: ${currentlyDueList.join(", ")}.`
    : null;
  const pendingVerification = pendingVerificationList.length
    ? `Stripe is still reviewing: ${pendingVerificationList.join(", ")}.`
    : null;
  const futureRequirements = eventuallyDueList.length
    ? `Stripe may request more details later: ${eventuallyDueList.join(", ")}.`
    : null;
  const disabledReason = account.requirements?.disabled_reason ?? null;
  const hasBlockingRequirements =
    Boolean(disabledReason) || Boolean(account.requirements?.past_due?.length) || Boolean(firstRequirementError);
  const onboardingIncomplete = currentlyDueList.length > 0 || pendingVerificationList.length > 0;

  if (chargesEnabled && payoutsEnabled && !hasBlockingRequirements && !onboardingIncomplete) {
    return {
      status: "completed",
      detail:
        futureRequirements ||
        "Stripe onboarding is complete and payouts are enabled for marketplace bookings.",
      accountId: account.id,
    };
  }

  if (hasBlockingRequirements) {
    return {
      status: "restricted",
      detail:
        firstRequirementError ||
        disabledReason ||
        currentlyDue ||
        "Stripe still needs more verification details before payouts can continue.",
      accountId: account.id,
    };
  }

  return {
    status: "pending",
    detail:
      currentlyDue ||
      pendingVerification ||
      "Stripe onboarding has started, but charges and payouts are not fully enabled yet.",
    accountId: account.id,
  };
}

export async function syncSpecialistStripeStatus(specialistId: string): Promise<StripeStatusSnapshot> {
  const { data: specialist, error } = await supabaseAdmin
    .from("specialists")
    .select("id, stripe_connect_id, stripe_connect_status")
    .eq("id", specialistId)
    .single();

  if (error || !specialist) {
    throw new Error(error?.message ?? "Unable to load specialist record.");
  }

  if (!specialist.stripe_connect_id) {
    return {
      status: specialist.stripe_connect_status ?? "not_started",
      detail: null,
      accountId: null,
    };
  }

  const account = await stripe.accounts.retrieve(specialist.stripe_connect_id);
  const snapshot = deriveStripeStatus(account);

  if (snapshot.status !== specialist.stripe_connect_status) {
    await supabaseAdmin
      .from("specialists")
      .update({
        stripe_connect_status: snapshot.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", specialistId);
  }

  return snapshot;
}

export async function syncSpecialistStripeStatusByAccountId(
  stripeConnectAccountId: string,
): Promise<StripeStatusSnapshot | null> {
  const { data: specialist, error } = await supabaseAdmin
    .from("specialists")
    .select("id, stripe_connect_status")
    .eq("stripe_connect_id", stripeConnectAccountId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!specialist) {
    return null;
  }

  return syncSpecialistStripeStatus(specialist.id);
}
