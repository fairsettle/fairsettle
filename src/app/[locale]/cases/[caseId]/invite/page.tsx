import { getTranslations } from "next-intl/server";
import { Mail } from "lucide-react";

import { InviteClient } from "@/components/invite/InviteClient";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function InvitePage({
  params: { caseId, locale },
}: {
  params: { caseId: string; locale: string };
}) {
  const t = await getTranslations({ locale });

  return (
    <main className=" px-5 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          brandLabel={t("nav.brand")}
          eyebrow={t("invitePage.title")}
          icon={Mail}
          locale={locale}
          subtitle={t("invitePage.subtitle")}
          title={t("invitePage.heading")}
        />

        <InviteClient caseId={caseId} />
      </div>
    </main>
  );
}
