import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { buildPublicMetadata } from "@/lib/seo";
import { getLocalizedPath } from "@/lib/locale-path";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  return buildPublicMetadata({
    locale,
    path: "/privacy",
    title: "Privacy Policy | FairSettle",
    description:
      "How FairSettle collects, uses, and protects personal information.",
  });
}

export default async function PrivacyPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale });

  return (
    <main className="app-shell px-5 pb-16 pt-5 text-ink sm:pt-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="app-panel space-y-5 px-6 py-7 sm:px-8">
          <p className="app-kicker">{t("landing.footerPrivacy")}</p>
          <h1 className="font-display text-4xl text-ink">
            {t("legal.privacyTitle")}
          </h1>
          <p className="app-copy">{t("legal.privacyIntro")}</p>

          <div className="grid gap-5">
            <article className="rounded-[1.5rem] border border-line/70 bg-surface-soft/75 p-5">
              <h2 className="font-display text-2xl text-ink">
                {t("legal.privacyDataTitle")}
              </h2>
              <p className="mt-2 text-sm leading-7 text-ink-soft">
                {t("legal.privacyDataBody")}
              </p>
            </article>
            <article className="rounded-[1.5rem] border border-line/70 bg-surface-soft/75 p-5">
              <h2 className="font-display text-2xl text-ink">
                {t("legal.privacySharingTitle")}
              </h2>
              <p className="mt-2 text-sm leading-7 text-ink-soft">
                {t("legal.privacySharingBody")}
              </p>
            </article>
          </div>

          <Button asChild className="w-fit">
            <Link href={getLocalizedPath(locale, "/")}>
              {t("legal.backHome")}
            </Link>
          </Button>
        </section>
      </div>
    </main>
  );
}
