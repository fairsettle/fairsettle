"use client";

import { SpecialistRatingForm } from "@/components/referrals/SpecialistRatingForm";
import { Card, CardContent } from "@/components/ui/card";

export type ReferralStatusCardReferral = {
  id: string;
  case_id: string;
  specialist_id: string;
  status:
    | "pending"
    | "accepted"
    | "session_scheduled"
    | "recommendation_submitted"
    | "completed"
    | "cancelled";
  meeting_mode: string | null;
  scheduled_for: string | null;
  specialists?: {
    id: string;
    full_name: string;
    specialist_type: string;
    rating_average?: number | null;
    rating_count?: number | null;
  } | null;
};

export function ReferralStatusAndRatingSection({
  referral,
  locale,
}: {
  referral: ReferralStatusCardReferral | null;
  locale: string;
}) {
  if (!referral) {
    return null;
  }

  const specialistName = referral.specialists?.full_name ?? "Assigned specialist";
  const specialistType = referral.specialists?.specialist_type ?? "specialist";

  return (
    <Card className="app-panel border-brand/15">
      <CardContent className="space-y-4 p-6">
        <div className="space-y-2">
          <p className="app-kicker">Specialist referral</p>
          <p className="text-sm leading-6 text-ink-soft">
            {specialistName} is handling this case as your {specialistType}.
          </p>
          <p className="text-sm text-ink-soft">
            Status: {referral.status}
            {referral.scheduled_for
              ? ` • ${new Date(referral.scheduled_for).toLocaleString(locale)}${referral.meeting_mode ? ` • ${referral.meeting_mode.replace("_", " ")}` : ""}`
              : ""}
          </p>
        </div>

        {referral.status === "completed" ? (
          <SpecialistRatingForm
            referralId={referral.id}
            specialistId={referral.specialist_id}
            caseId={referral.case_id}
            locale={locale}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
