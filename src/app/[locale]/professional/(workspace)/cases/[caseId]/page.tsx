import {
  FileSearch,
  FileStack,
  Flag,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { AdminSectionCard } from "@/components/admin/AdminSectionCard";
import { ProfessionalMetricCard } from "@/components/professional/ProfessionalMetricCard";
import { ReferralStatusBadge } from "@/components/professional/ReferralStatusBadge";
import { ProfessionalReferralScheduleCard } from "@/components/referrals/ProfessionalReferralScheduleCard";
import { Button } from "@/components/ui/button";
import { getStrictLocalizedPath } from "@/lib/locale-path";
import {
  buildReferralRequestSummary,
  formatAnswerValue,
  formatCurrency,
  formatDateTime,
  formatMeetingMode,
  formatPaymentModel,
  formatReviewBucket,
  formatLocalizedText,
  severityTone,
} from "@/lib/professional/presentation";
import { requireSpecialist } from "@/lib/professional/auth";
import { getProfessionalCaseView } from "@/lib/referrals/service";
import { cn } from "@/lib/utils";

function reviewBucketTone(bucket: string | null | undefined) {
  switch (bucket) {
    case "agreed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "locked":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "disputed":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "unresolved":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-surface-soft text-ink-soft border-line/70";
  }
}

export default async function ProfessionalCasePage({
  params: { locale, caseId },
}: {
  params: { locale: string; caseId: string };
}) {
  const professional = await requireSpecialist(locale);
  const data = await getProfessionalCaseView(caseId, professional.specialistId, locale);
  const referral = data.referral as any;

  const complexityFlags = Array.isArray((data.caseItem as any)?.complexity_flags)
    ? ((data.caseItem as any).complexity_flags as Array<{
        key: string;
        severity: string;
        reason: string;
        recommended_specialist_type?: string;
      }>)
    : [];

  const disputeItems = data.comparison.items.filter((item) => item.review_bucket !== "agreed").slice(0, 10);
  const partySnapshot = data.comparison.items.slice(0, 8);
  const recommendationHighlights = data.resolution.suggestions.slice(0, 6);

  return (
    <div className="space-y-8">
      <AdminPageIntro
        eyebrow="Specialist case desk"
        title={`Case ${caseId}`}
        description="Review the referral, understand the live dispute, and move smoothly from preparation into specialist recommendations."
        icon={FileStack}
      />

      <div className="flex flex-wrap items-center gap-3">
        <ReferralStatusBadge status={referral.status} />
        <span className="rounded-full border border-line/80 bg-surface-soft px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-ink-soft">
          {formatPaymentModel(referral.payment_model)}
        </span>
        <span className="rounded-full border border-line/80 bg-surface-soft px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-ink-soft">
          {formatMeetingMode(referral.meeting_mode)}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProfessionalMetricCard
          label="Compared items"
          value={String(data.comparison.items.length)}
          detail={`${data.comparison.summary.agreed_count} agreed`}
          accent="brand"
        />
        <ProfessionalMetricCard
          label="Live issues"
          value={String(disputeItems.length)}
          detail="Needs specialist judgement"
          accent="warning"
        />
        <ProfessionalMetricCard
          label="Evidence files"
          value={String(data.documents.length)}
          detail={data.documents.length ? "Downloads ready" : "No uploads yet"}
          accent="neutral"
        />
        <ProfessionalMetricCard
          label="Gross payment"
          value={formatCurrency(referral.payment_amount)}
          detail={`Expected payout ${formatCurrency(referral.specialist_payout_amount)}`}
          accent="success"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
        <AdminSectionCard
          icon={FileSearch}
          title="Referral coordination"
          description="Use this panel to keep the case moving, keep parents informed, and keep the specialist workflow structured."
          action={(
            <Button asChild>
              <Link href={getStrictLocalizedPath(locale, `/professional/cases/${caseId}/recommend`)}>
                Open recommendation form
              </Link>
            </Button>
          )}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-[1.35rem] border border-line/80 bg-surface-soft/60 p-4">
                <p className="app-kicker">Referral summary</p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  {buildReferralRequestSummary((data.referral as any).referral_requests)}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Scheduled for</p>
                    <p className="mt-1 text-sm font-medium text-ink">{formatDateTime(referral.scheduled_for, locale)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Meeting mode</p>
                    <p className="mt-1 text-sm font-medium text-ink">{formatMeetingMode(referral.meeting_mode)}</p>
                  </div>
                </div>
                {referral.meeting_link ? (
                  <a
                    className="mt-4 inline-flex text-sm font-medium text-brand"
                    href={referral.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open meeting link
                  </a>
                ) : null}
              </div>

              <div className="rounded-[1.35rem] border border-line/80 bg-surface-soft/60 p-4">
                <p className="app-kicker">Narrative summary</p>
                <p className="mt-3 text-sm leading-6 text-ink-soft">{data.narrativeSummary.text}</p>
                <p className="mt-4 text-sm leading-6 text-ink-soft">{data.cooperationSummary}</p>
              </div>
            </div>

            <ProfessionalReferralScheduleCard
              referralId={referral.id}
              initialStatus={referral.status}
              initialScheduledFor={referral.scheduled_for}
              initialMeetingMode={referral.meeting_mode}
              initialMeetingLink={referral.meeting_link}
              initialMeetingInstructions={referral.meeting_instructions}
              locale={locale}
            />
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          icon={Sparkles}
          title="Recommendation framing"
          description="This is the distilled AI and comparison context to help you set your own professional view quickly."
        >
          <div className="space-y-4">
            <div className="rounded-[1.35rem] border border-line/80 bg-surface-soft/60 p-4">
              <p className="app-kicker">AI overview</p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                {data.resolution.overall_summary || "Rule-based resolution is active for this case, so the comparison below is the primary input."}
              </p>
            </div>

            <div className="space-y-3">
              {data.resolution.key_trade_offs.length ? data.resolution.key_trade_offs.map((tradeOff) => (
                <div
                  key={tradeOff}
                  className="rounded-[1.25rem] border border-line/80 bg-surface-soft/60 px-4 py-4 text-sm leading-6 text-ink-soft"
                >
                  {tradeOff}
                </div>
              )) : (
                <div className="rounded-[1.25rem] border border-dashed border-line bg-surface-soft/60 px-4 py-8 text-center text-sm text-ink-soft">
                  No explicit AI trade-offs were generated for this case yet.
                </div>
              )}
            </div>
          </div>
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        icon={Sparkles}
        title="Live dispute matrix"
        description="Review the highest-friction items with both parent positions and the current AI suggestion side by side."
      >
        <div className="space-y-4">
          {disputeItems.length ? disputeItems.map((item) => {
            const aiSuggestion = recommendationHighlights.find((suggestion) => suggestion.item_key === item.item_key);

            return (
              <div
                key={item.item_key}
                className="rounded-[1.5rem] border border-line/80 bg-surface-soft/60 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-base font-medium text-ink">{formatLocalizedText(item.question_text, locale)}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">{item.section}</p>
                  </div>
                  <span className={cn("rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.14em]", reviewBucketTone(item.review_bucket))}>
                    {formatReviewBucket(item.review_bucket)}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)]">
                  <div className="rounded-[1.15rem] border border-line/80 bg-surface px-4 py-4">
                    <p className="app-kicker">Party A</p>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">{formatAnswerValue(item.party_a_answer, locale)}</p>
                  </div>
                  <div className="rounded-[1.15rem] border border-line/80 bg-surface px-4 py-4">
                    <p className="app-kicker">Party B</p>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">{formatAnswerValue(item.party_b_answer, locale)}</p>
                  </div>
                  <div className="rounded-[1.15rem] border border-brand/15 bg-brand-soft/40 px-4 py-4">
                    <p className="app-kicker">AI suggestion</p>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      {aiSuggestion?.ai_suggested_outcome || "No AI suggestion surfaced for this item yet."}
                    </p>
                    {aiSuggestion?.ai_reasoning ? (
                      <p className="mt-3 text-sm leading-6 text-ink-soft">{aiSuggestion.ai_reasoning}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="rounded-[1.5rem] border border-dashed border-line bg-surface-soft/60 px-6 py-12 text-center text-sm text-ink-soft">
              There are no live dispute items right now. The case appears to be mostly aligned.
            </div>
          )}
        </div>
      </AdminSectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard
          icon={Flag}
          title="Party positions snapshot"
          description="A cleaner view of the most relevant answers from each side before you move into the full recommendation form."
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-3">
              <p className="app-kicker">Party A</p>
              {partySnapshot.map((item) => (
                <div key={`${item.item_key}-party-a`} className="rounded-[1.15rem] border border-line/80 bg-surface-soft/60 px-4 py-4">
                  <p className="text-sm font-medium text-ink">{formatLocalizedText(item.question_text, locale)}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">{formatAnswerValue(item.party_a_answer, locale)}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <p className="app-kicker">Party B</p>
              {partySnapshot.map((item) => (
                <div key={`${item.item_key}-party-b`} className="rounded-[1.15rem] border border-line/80 bg-surface-soft/60 px-4 py-4">
                  <p className="text-sm font-medium text-ink">{formatLocalizedText(item.question_text, locale)}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">{formatAnswerValue(item.party_b_answer, locale)}</p>
                </div>
              ))}
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          icon={ShieldAlert}
          title="Evidence, complexity, and tone"
          description="Keep all the contextual signals together so you can judge risk, safeguarding, and practical next steps without jumping between tools."
        >
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="app-kicker">Evidence index</p>
              {data.documents.length ? data.documents.map((document) => (
                <div key={document.id} className="rounded-[1.15rem] border border-line/80 bg-surface-soft/60 px-4 py-4">
                  <p className="text-sm font-medium text-ink">{document.file_name}</p>
                  {document.signed_url ? (
                    <a className="mt-2 inline-flex text-sm font-medium text-brand" href={document.signed_url} target="_blank" rel="noreferrer">
                      Download evidence
                    </a>
                  ) : (
                    <p className="mt-2 text-sm text-ink-soft">Download link unavailable.</p>
                  )}
                </div>
              )) : (
                <div className="rounded-[1.15rem] border border-dashed border-line bg-surface-soft/60 px-4 py-6 text-sm text-ink-soft">
                  No uploaded evidence is attached to this case yet.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="app-kicker">Complexity flags</p>
              {complexityFlags.length ? complexityFlags.map((flag) => (
                <div key={flag.key} className={cn("rounded-[1.15rem] border px-4 py-4", severityTone(flag.severity))}>
                  <p className="text-sm font-medium text-ink">{flag.key.replaceAll("_", " ")}</p>
                  <p className="mt-2 text-sm leading-6">{flag.reason}</p>
                  {flag.recommended_specialist_type ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.16em]">Best fit: {flag.recommended_specialist_type}</p>
                  ) : null}
                </div>
              )) : (
                <div className="rounded-[1.15rem] border border-dashed border-line bg-surface-soft/60 px-4 py-6 text-sm text-ink-soft">
                  No complexity flags are active on this case.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="app-kicker">Tone and safeguarding logs</p>
              {data.sentimentLogs.length ? data.sentimentLogs.slice(0, 5).map((log) => (
                <div key={log.id} className={cn("rounded-[1.15rem] border px-4 py-4", severityTone(log.risk_level))}>
                  <p className="text-sm font-medium text-ink">
                    {log.field_name} • {(log.risk_level || "logged").toUpperCase()}
                  </p>
                  <p className="mt-2 text-sm leading-6">{log.ai_explanation || "Moderation activity was logged for this submission."}</p>
                </div>
              )) : (
                <div className="rounded-[1.15rem] border border-dashed border-line bg-surface-soft/60 px-4 py-6 text-sm text-ink-soft">
                  No flagged tone entries are stored for this case.
                </div>
              )}
            </div>
          </div>
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        icon={FileStack}
        title="Case timeline"
        description="A short factual trail of what has happened in the case so far."
      >
        <div className="space-y-3">
          {data.timeline.length ? data.timeline.map((event) => (
            <div key={event.id} className="rounded-[1.15rem] border border-line/80 bg-surface-soft/60 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-ink">{event.event_type.replaceAll("_", " ")}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">{formatDateTime(event.created_at, locale)}</p>
              </div>
            </div>
          )) : (
            <div className="rounded-[1.15rem] border border-dashed border-line bg-surface-soft/60 px-4 py-6 text-sm text-ink-soft">
              No case timeline entries are available yet.
            </div>
          )}
        </div>
      </AdminSectionCard>
    </div>
  );
}
