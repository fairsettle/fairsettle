import { Scale } from "lucide-react";

import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { AdminSectionCard } from "@/components/admin/AdminSectionCard";
import { ProfessionalRecommendationForm } from "@/components/referrals/ProfessionalRecommendationForm";
import { formatLocalizedText } from "@/lib/professional/presentation";
import { requireSpecialist } from "@/lib/professional/auth";
import { getProfessionalCaseView } from "@/lib/referrals/service";

export default async function ProfessionalRecommendationPage({
  params: { locale, caseId },
}: {
  params: { locale: string; caseId: string };
}) {
  const professional = await requireSpecialist(locale);
  const data = await getProfessionalCaseView(caseId, professional.specialistId);
  const referralId = (data.referral as any).id;
  const items = data.comparison.items.map((item) => ({
    item_key: item.item_key,
    question_id: item.question_id,
    child_id: item.child_id,
    question_label: formatLocalizedText(item.question_text, locale),
  }));

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Recommendation"
        title="Submit professional recommendation"
        description="Map your recommendation to the existing case items so parent responses can feed back into the canonical FairSettle resolution state."
        icon={Scale}
      />

      <AdminSectionCard
        icon={Scale}
        title="Recommendation form"
        description="Recommendations stay separate from the canonical case state until both parents accept the same value."
      >
        <ProfessionalRecommendationForm
          caseId={caseId}
          referralId={referralId}
          items={items}
          locale={locale}
        />
      </AdminSectionCard>
    </div>
  );
}
