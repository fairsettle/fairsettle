import { BriefcaseBusiness } from "lucide-react";

import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { SpecialistApplicationForm } from "@/components/referrals/SpecialistApplicationForm";

export default function ProfessionalApplyPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="space-y-6">
        <AdminPageIntro
          eyebrow="Join FairSettle"
          title="Apply as a specialist"
          description="Apply to join the FairSettle referral network as a mediator or solicitor. Applications are reviewed manually before the professional workspace is unlocked."
          icon={BriefcaseBusiness}
        />
        <SpecialistApplicationForm locale={locale} />
      </div>
    </main>
  );
}
