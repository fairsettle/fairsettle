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
    path: "/terms",
    title: "Terms of Service | FairSettle",
    description: "The main terms for using FairSettle's platform.",
  });
}

export default async function TermsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale });

  return (
    <main className="app-shell px-5 pb-16 pt-5 text-ink sm:pt-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="app-panel space-y-5 px-6 py-7 sm:px-8">
          <p className="app-kicker">{t("landing.footerTerms")}</p>
          <h1 className="font-display text-4xl text-ink">
            {t("legal.termsTitle")}
          </h1>
          <p className="app-copy">{t("legal.termsIntro")}</p>

          <div className="grid gap-5">
            <article className="rounded-[1.5rem] border border-line/70 bg-surface-soft/75 p-5">
              <h2 className="font-display text-2xl text-ink">
                {t("legal.termsUseTitle")}
              </h2>
              <p className="mt-2 text-sm leading-7 text-ink-soft">
                {t("legal.termsUseBody")}
              </p>
            </article>
            <article className="rounded-[1.5rem] border border-line/70 bg-surface-soft/75 p-5">
              <h2 className="font-display text-2xl text-ink">
                {t("legal.termsLegalTitle")}
              </h2>
              <p className="mt-2 text-sm leading-7 text-ink-soft">
                {t("legal.termsLegalBody")}
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
