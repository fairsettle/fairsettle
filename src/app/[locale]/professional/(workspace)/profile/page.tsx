import { UserCircle2 } from "lucide-react";

import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { AdminSectionCard } from "@/components/admin/AdminSectionCard";
import { ConnectOnboardingCard } from "@/components/referrals/ConnectOnboardingCard";
import { requireSpecialist } from "@/lib/professional/auth";
import { syncSpecialistStripeStatus } from "@/lib/professional/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function ProfessionalProfilePage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { connect?: string };
}) {
  const professional = await requireSpecialist(locale);
  const { data: specialist } = await supabaseAdmin
    .from("specialists")
    .select("*")
    .eq("id", professional.specialistId)
    .maybeSingle();

  const stripeSnapshot = specialist?.stripe_connect_id
    ? await syncSpecialistStripeStatus(professional.specialistId)
    : {
        status: (specialist?.stripe_connect_status ?? "not_started") as
          | "not_started"
          | "pending"
          | "completed"
          | "restricted",
        detail: null,
        accountId: specialist?.stripe_connect_id ?? null,
      };
  const returnedFromStripe = searchParams?.connect === "return";

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Profile"
        title="Professional profile"
        description="This is the live profile used in the FairSettle marketplace and referral system."
        icon={UserCircle2}
      />

      <AdminSectionCard
        icon={UserCircle2}
        title="Marketplace profile"
        description="Profile editing can expand in a later refinement pass; the current view keeps the live specialist record visible."
      >
        {returnedFromStripe ? (
          <div className="mb-5 rounded-[1.25rem] border border-brand/20 bg-brand-soft/60 px-4 py-3 text-sm text-ink-soft">
            Stripe onboarding has been refreshed. Current status:{" "}
            <span className="font-medium text-ink">{stripeSnapshot.status}</span>
            {stripeSnapshot.detail ? ` — ${stripeSnapshot.detail}` : ""}
          </div>
        ) : null}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="grid gap-3 text-sm text-ink-soft md:grid-cols-2">
            <p>Name: {specialist?.full_name}</p>
            <p>Email: {specialist?.email}</p>
            <p>Type: {specialist?.specialist_type}</p>
            <p>Accreditation: {specialist?.accreditation_body}</p>
            <p>Rate: £{specialist?.hourly_rate}</p>
            <p>Remote available: {specialist?.remote_available ? "Yes" : "No"}</p>
            <p>Languages: {specialist?.languages?.join(", ")}</p>
            <p>Specialisms: {specialist?.specialisms?.join(", ")}</p>
            <p>Connect status: {stripeSnapshot.status}</p>
            <p>Verified: {specialist?.is_verified ? "Yes" : "No"}</p>
          </div>
          <ConnectOnboardingCard
            locale={locale}
            status={stripeSnapshot.status}
            statusDetail={stripeSnapshot.detail}
          />
        </div>
      </AdminSectionCard>
    </div>
  );
}
