import {
  BriefcaseBusiness,
  CalendarClock,
  CircleDollarSign,
  FileSignature,
} from "lucide-react";
import Link from "next/link";

import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { AdminSectionCard } from "@/components/admin/AdminSectionCard";
import { ProfessionalMetricCard } from "@/components/professional/ProfessionalMetricCard";
import {
  ProfessionalReferralsTable,
  type ProfessionalReferralRow,
} from "@/components/professional/ProfessionalReferralsTable";
import { Button } from "@/components/ui/button";
import { getStrictLocalizedPath } from "@/lib/locale-path";
import {
  buildReferralRequestSummary,
  formatCurrency,
} from "@/lib/professional/presentation";
import { requireSpecialist } from "@/lib/professional/auth";
import { listProfessionalReferrals } from "@/lib/referrals/service";

const ACTIVE_STATUSES = new Set(["pending", "accepted", "session_scheduled", "recommendation_submitted"]);

export default async function ProfessionalDashboardPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const professional = await requireSpecialist(locale);
  const referrals = (await listProfessionalReferrals(professional.specialistId)) as Array<any>;

  const activeReferrals = referrals.filter((referral) => ACTIVE_STATUSES.has(referral.status));
  const scheduledSessions = referrals.filter((referral) => referral.status === "session_scheduled");
  const recommendationStage = referrals.filter((referral) => referral.status === "recommendation_submitted");
  const paidVolume = referrals.reduce(
    (sum, referral) => sum + Number(referral.payment_amount ?? 0),
    0,
  );

  const recentRows: ProfessionalReferralRow[] = referrals.slice(0, 6).map((referral) => ({
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

  const attentionItems = [
    scheduledSessions.length
      ? `${scheduledSessions.length} session${scheduledSessions.length === 1 ? "" : "s"} are booked and need prep notes or materials.`
      : null,
    recommendationStage.length
      ? `${recommendationStage.length} case${recommendationStage.length === 1 ? "" : "s"} are waiting for parent responses to your recommendation.`
      : null,
    activeReferrals.length && !scheduledSessions.length
      ? `${activeReferrals.length} active referral${activeReferrals.length === 1 ? "" : "s"} still need a clear next step or session date.`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      <AdminPageIntro
        eyebrow="Professional workspace"
        title="Dashboard"
        description="Your active referrals, next actions, and earnings at a glance."
        icon={BriefcaseBusiness}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProfessionalMetricCard
          label="Active referrals"
          value={String(activeReferrals.length)}
          detail={`${referrals.length} total assigned`}
          accent="brand"
        />
        <ProfessionalMetricCard
          label="Sessions scheduled"
          value={String(scheduledSessions.length)}
          detail={scheduledSessions.length ? "Meeting plans are set" : "No sessions booked yet"}
          accent="success"
        />
        <ProfessionalMetricCard
          label="Recommendations pending"
          value={String(recommendationStage.length)}
          detail={recommendationStage.length ? "Awaiting parent response" : "Nothing waiting on parents"}
          accent="warning"
        />
        <ProfessionalMetricCard
          label="Gross booking volume"
          value={formatCurrency(paidVolume)}
          detail="Connect and Mediator Assist revenue seen so far"
          accent="neutral"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <AdminSectionCard
          icon={BriefcaseBusiness}
          title="Assigned referrals"
          description="Recent referrals with the key details you need."
          action={(
            <Button asChild variant="outline">
              <Link href={getStrictLocalizedPath(locale, "/professional/cases")}>View all cases</Link>
            </Button>
          )}
        >
          <ProfessionalReferralsTable
            rows={recentRows}
            emptyTitle="No assigned referrals yet"
            emptyCopy="Once a case is assigned or booked through the marketplace, it will appear here with scheduling and payment details."
          />
        </AdminSectionCard>

        <AdminSectionCard
          icon={CalendarClock}
          title="What needs attention"
          description="Quick actions for today."
          contentClassName="space-y-4"
        >
          {attentionItems.length ? (
            <div className="space-y-3">
              {attentionItems.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.25rem] border border-line/80 bg-surface-soft/70 px-4 py-4 text-sm leading-6 text-ink-soft"
                >
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-line bg-surface-soft/60 px-4 py-8 text-center text-sm text-ink-soft">
              Your queue is calm right now. New assignments, bookings, or parent responses will show up here automatically.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-line/80 bg-surface px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="app-icon-chip">
                  <CircleDollarSign className="size-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-ink">Review earnings</p>
                    <p className="text-sm text-ink-soft">Check gross volume and payout.</p>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={getStrictLocalizedPath(locale, "/professional/earnings")}>Open earnings</Link>
                  </Button>
                </div>
              </div>
            </div>
            <div className="rounded-[1.25rem] border border-line/80 bg-surface px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="app-icon-chip">
                  <FileSignature className="size-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-ink">Prepare recommendations</p>
                    <p className="text-sm text-ink-soft">Open the case desk and continue casework.</p>
                  </div>
                  <Button asChild>
                    <Link href={getStrictLocalizedPath(locale, "/professional/cases")}>Open cases</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </AdminSectionCard>
      </div>
    </div>
  );
}
