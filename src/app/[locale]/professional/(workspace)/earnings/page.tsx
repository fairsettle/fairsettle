import { CircleDollarSign, Landmark, WalletCards } from "lucide-react";

import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { AdminSectionCard } from "@/components/admin/AdminSectionCard";
import { ProfessionalMetricCard } from "@/components/professional/ProfessionalMetricCard";
import {
  ProfessionalReferralsTable,
  type ProfessionalReferralRow,
} from "@/components/professional/ProfessionalReferralsTable";
import { getStrictLocalizedPath } from "@/lib/locale-path";
import {
  buildReferralRequestSummary,
  formatCurrency,
} from "@/lib/professional/presentation";
import { requireSpecialist } from "@/lib/professional/auth";
import { listProfessionalReferrals } from "@/lib/referrals/service";

export default async function ProfessionalEarningsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const professional = await requireSpecialist(locale);
  const referrals = (await listProfessionalReferrals(professional.specialistId)) as Array<any>;

  const paidReferrals = referrals.filter((referral) => Number(referral.payment_amount ?? 0) > 0);
  const totalVolume = paidReferrals.reduce(
    (sum, row) => sum + Number(row.payment_amount ?? 0),
    0,
  );
  const totalPayout = paidReferrals.reduce(
    (sum, row) => sum + Number(row.specialist_payout_amount ?? 0),
    0,
  );
  const platformFees = paidReferrals.reduce(
    (sum, row) => sum + Number(row.platform_fee_amount ?? 0),
    0,
  );
  const completedPaidReferrals = paidReferrals.filter((row) => row.status === "completed").length;
  const awaitingAction = paidReferrals.filter((row) => row.status !== "completed" && row.status !== "cancelled").length;

  const rows: ProfessionalReferralRow[] = paidReferrals.slice(0, 10).map((referral) => ({
    id: referral.id,
    caseId: referral.case_id,
    status: referral.status,
    paymentModel: referral.payment_model ?? "request_only",
    createdAt: referral.created_at,
    scheduledFor: referral.scheduled_for,
    paymentAmount: referral.payment_amount,
    payoutAmount: referral.specialist_payout_amount,
    requesterSummary: buildReferralRequestSummary(referral.referral_requests),
    detailHref: getStrictLocalizedPath(locale, `/professional/cases/${referral.case_id}`),
  }));

  return (
    <div className="space-y-8">
      <AdminPageIntro
        eyebrow="Revenue"
        title="Earnings"
        description="Track volume, payout, and what still needs to be completed."
        icon={CircleDollarSign}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProfessionalMetricCard
          label="Gross booking volume"
          value={formatCurrency(totalVolume)}
          detail={`${paidReferrals.length} paid booking${paidReferrals.length === 1 ? "" : "s"}`}
          accent="brand"
        />
        <ProfessionalMetricCard
          label="Estimated payout"
          value={formatCurrency(totalPayout)}
          detail="Your share after platform fees"
          accent="success"
        />
        <ProfessionalMetricCard
          label="Platform retained"
          value={formatCurrency(platformFees)}
          detail="Commission already tracked in referral records"
          accent="neutral"
        />
        <ProfessionalMetricCard
          label="Sessions still in progress"
          value={String(awaitingAction)}
          detail={completedPaidReferrals ? `${completedPaidReferrals} completed paid sessions` : "No completed paid sessions yet"}
          accent="warning"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <AdminSectionCard
          icon={WalletCards}
          title="Recent paid referrals"
          description="Paid referrals linked to your specialist profile."
        >
          <ProfessionalReferralsTable
            rows={rows}
            emptyTitle="No paid referrals yet"
            emptyCopy="Once a parent completes marketplace checkout or Mediator Assist payment, the booking and payout amounts will appear here automatically."
          />
        </AdminSectionCard>

        <AdminSectionCard
          icon={Landmark}
          title="Payout health"
          description="A quick read on what is settled and what is still open."
        >
          <div className="space-y-3">
            <div className="rounded-[1.25rem] border border-line/80 bg-surface-soft/70 px-4 py-4">
              <p className="app-kicker">Completed sessions</p>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                {completedPaidReferrals
                  ? `${completedPaidReferrals} paid referral${completedPaidReferrals === 1 ? "" : "s"} have already moved through to a completed case status.`
                  : "No paid referrals have been marked completed yet."}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-line/80 bg-surface-soft/70 px-4 py-4">
              <p className="app-kicker">Still awaiting action</p>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                {awaitingAction
                  ? `${awaitingAction} paid referral${awaitingAction === 1 ? "" : "s"} still need scheduling, recommendation work, or final completion.`
                  : "Everything paid so far is already completed or closed."}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-line/80 bg-surface-soft/70 px-4 py-4">
              <p className="app-kicker">What this page means</p>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                Gross volume is the total client payment recorded on referrals. Estimated payout is your tracked share after the platform commission. Final transfer timing still depends on Stripe Connect settlement timing and your connected-account state.
              </p>
            </div>
          </div>
        </AdminSectionCard>
      </div>
    </div>
  );
}
