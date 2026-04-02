import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Scale, ShieldCheck, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getLocalizedPath } from "@/lib/locale-path";

export default async function LocaleIndexPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale });

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect(getLocalizedPath(locale, "/dashboard"));
    }
  } catch {}

  return (
    <main className="app-shell overflow-hidden px-5 pb-12 pt-5 text-ink sm:pt-6">
      <div className="relative mx-auto flex max-w-5xl flex-col gap-8 sm:gap-10">
        <section className="app-panel-brand overflow-hidden px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div className="max-w-2xl space-y-6">
              <Badge className="px-4 py-1" variant="secondary">
                {t("nav.brand")}
              </Badge>

              <div className="space-y-3">
                <h1 className="app-title max-w-2xl text-[3.2rem] leading-[0.9] sm:text-[4.4rem]">
                  <span className="block">{t("landing.headline")}</span>
                  <span className="block text-brand">
                    {t("landing.headline2")}
                  </span>
                </h1>
                <p className="max-w-xl text-base leading-7 text-ink-soft sm:text-lg">
                  {t("landing.subheadline")}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-12 px-6 text-base" size="lg">
                  <Link href={getLocalizedPath(locale, "/register")}>
                    {t("nav.start")}
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  className="h-12 px-6 text-base"
                  size="lg"
                  variant="outline"
                >
                  <Link href={getLocalizedPath(locale, "/invite-lookup")}>
                    {t("nav.invited")}
                  </Link>
                </Button>
              </div>
            </div>

            <Card className="app-panel border-white/70 bg-surface/92 lg:mt-1">
              <CardContent className="space-y-6 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-ink-soft/70">
                      {t("landing.costSolicitor")}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-danger line-through decoration-warning decoration-2">
                      {t("landing.costSolicitorValue")}
                    </p>
                  </div>
                  <ShieldCheck className="mt-1 size-8 text-brand" />
                </div>

                <div className="rounded-[1.75rem] bg-[linear-gradient(145deg,rgba(6,78,59,0.96),rgba(13,148,136,0.92))] p-5 text-white shadow-[0_24px_60px_rgba(13,148,136,0.18)]">
                  <p className="text-sm uppercase tracking-[0.24em] text-white/72">
                    {t("landing.costFairSettle")}
                  </p>
                  <p className="mt-3 text-4xl font-semibold">
                    {t("landing.costFairSettleValue")}
                  </p>
                  <div className="mt-6 grid gap-3 text-sm text-white/88">
                    <div className="flex items-center gap-3">
                      <Scale className="size-4" />
                      <span>{t("comparison.seeOutcomes")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Wallet className="size-4" />
                      <span>
                        {t("savings.youveSaved", { amount: "£5,876" })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="app-panel-soft space-y-3 p-6">
            <p className="app-kicker">{t("invite.title")}</p>
            <h2 className="font-display text-2xl text-ink">
              {t("responder.neutralityTitle")}
            </h2>
            <p className="app-copy">{t("responder.neutralityBody")}</p>
          </article>
          <article className="app-panel-soft space-y-3 p-6">
            <p className="app-kicker">{t("gdpr.dataSafe")}</p>
            <h2 className="font-display text-2xl text-ink">
              {t("gdpr.dataSafe")}
            </h2>
            <p className="app-copy">{t("gdpr.gdprNotice")}</p>
          </article>
          <article className="app-panel-soft space-y-3 p-6">
            <p className="app-kicker">{t("savings.fairsettle")}</p>
            <h2 className="font-display text-2xl text-ink">
              {t("export.professional")}
            </h2>
            <p className="app-copy">{t("export.footerNote")}</p>
          </article>
        </section>
      </div>
    </main>
  );
}
