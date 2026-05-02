import { ShieldCheck } from "lucide-react";

import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { AdminSectionCard } from "@/components/admin/AdminSectionCard";
import { SpecialistApplicationReviewCard } from "@/components/referrals/SpecialistApplicationReviewCard";
import { listSpecialistApplicationsForAdmin } from "@/lib/referrals/service";

export default async function AdminSpecialistsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const applications = await listSpecialistApplicationsForAdmin();

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Verification"
        title="Specialists"
        description="Review public specialist applications, verify credentials, and approve professionals for the marketplace."
        icon={ShieldCheck}
      />

      <AdminSectionCard
        icon={ShieldCheck}
        title="Applications"
        description="Approvals create live specialist profiles and unlock the professional workspace."
      >
        <div className="space-y-4">
          {applications.length ? applications.map((application) => (
            <SpecialistApplicationReviewCard
              key={application.id}
              application={application as any}
              locale={locale}
            />
          )) : (
            <p className="rounded-[1.5rem] border border-line/80 bg-surface px-4 py-10 text-center text-ink-soft">
              No specialist applications yet.
            </p>
          )}
        </div>
      </AdminSectionCard>
    </div>
  );
}
