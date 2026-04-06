import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  ShieldCheck,
  Wallet,
  Waypoints,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getLandingFeatures,
  getLandingPricingTiers,
  getLandingProblemCards,
  getLandingSteps,
} from "@/lib/landing-content";
import {
  buildPublicMetadata,
  getLandingSeo,
  getLandingStructuredData,
} from "@/lib/seo";
import { getLocalizedPath } from "@/lib/locale-path";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const seo = getLandingSeo(locale);

  return buildPublicMetadata({
    locale,
    path: "/",
    title: seo.title,
    description: seo.description,
  });
}

export default async function LocaleIndexPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale });
  const structuredData = getLandingStructuredData(locale);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect(getLocalizedPath(locale, "/dashboard"));
    }
  } catch {}

  const problemCards = getLandingProblemCards(t);
  const steps = getLandingSteps(t);
  const features = getLandingFeatures(t);
  const pricingTiers = getLandingPricingTiers(t);

  return (
    <main className="app-shell overflow-hidden px-5 pb-16 pt-5 text-ink sm:pt-6">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
        type="application/ld+json"
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-12 sm:gap-14">
        <section className="grid gap-8 pt-3 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="space-y-6">
            <Badge className="px-4 py-1" variant="secondary">
              {t("landing.eyebrow")}
            </Badge>

            <div className="space-y-4">
              <h1 className="app-title max-w-3xl text-[3.4rem] leading-[0.9] sm:text-[4.7rem] lg:text-[5.4rem]">
                <span className="block">{t("landing.headline")}</span>
                <span className="block text-brand">
                  {t("landing.headline2")}
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
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

          <Card className="border-white/70 bg-surface/94">
            <CardContent className="space-y-6 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-ink-soft/72">
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
                    <Waypoints className="size-4" />
                    <span>{t("landing.cardPoint1")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Wallet className="size-4" />
                    <span>{t("landing.cardPoint2")}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-line/70 bg-surface-soft/85 p-4 text-sm leading-6 text-ink-soft">
                <p className="font-medium text-ink">
                  {t("landing.cardFooterTitle")}
                </p>
                <p className="mt-1">{t("landing.cardFooterBody")}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article className="app-panel-soft p-6">
            <p className="app-kicker">{t("invite.title")}</p>
            <h2 className="mt-3 font-display text-2xl text-ink">
              {t("responder.neutralityTitle")}
            </h2>
            <p className="mt-3 app-copy">{t("responder.neutralityBody")}</p>
          </article>
          <article className="app-panel-soft p-6">
            <p className="app-kicker">{t("gdpr.dataSafe")}</p>
            <h2 className="mt-3 font-display text-2xl text-ink">
              {t("gdpr.dataSafe")}
            </h2>
            <p className="mt-3 app-copy">{t("gdpr.gdprNotice")}</p>
          </article>
          <article className="app-panel-soft p-6 sm:col-span-2 xl:col-span-1">
            <p className="app-kicker">{t("export.professional")}</p>
            <h2 className="mt-3 font-display text-2xl text-ink">
              {t("landing.supportTitle")}
            </h2>
            <p className="mt-3 app-copy">{t("landing.supportBody")}</p>
          </article>
        </section>

        <section className="space-y-6">
          <div className="max-w-3xl space-y-3">
            <p className="app-kicker">{t("landing.problemEyebrow")}</p>
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              {t("landing.problemTitle")}
            </h2>
            <p className="text-base leading-7 text-ink-soft">
              {t("landing.problemBody")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {problemCards.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="app-panel-soft app-interactive-card p-6"
              >
                <div className="app-icon-chip">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 font-display text-2xl text-ink">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-ink-soft">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="max-w-3xl space-y-3">
            <p className="app-kicker">{t("landing.howEyebrow")}</p>
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              {t("landing.howTitle")}
            </h2>
            <p className="text-base leading-7 text-ink-soft">
              {t("landing.howBody")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {steps.map((step) => (
              <article key={step.number} className="app-panel p-6">
                <div className="app-chip px-3 py-1 text-xs">{step.number}</div>
                <h3 className="mt-4 font-display text-2xl text-ink">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-ink-soft">
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="max-w-3xl space-y-3">
            <p className="app-kicker">{t("landing.featuresEyebrow")}</p>
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              {t("landing.featuresTitle")}
            </h2>
            <p className="text-base leading-7 text-ink-soft">
              {t("landing.featuresBody")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <article key={title} className="app-panel-soft p-6">
                <div className="flex items-start gap-4">
                  <div className="app-icon-chip">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-ink">{title}</h3>
                    <p className="mt-2 text-sm leading-7 text-ink-soft">
                      {body}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="max-w-3xl space-y-3">
            <p className="app-kicker">{t("landing.pricingEyebrow")}</p>
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              {t("landing.pricingTitle")}
            </h2>
            <p className="text-base leading-7 text-ink-soft">
              {t("landing.pricingBody")}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <Card
                key={tier.name}
                className={
                  tier.featured
                    ? "border-brand/30 shadow-[0_26px_72px_rgba(13,148,136,0.14)]"
                    : undefined
                }
              >
                <CardContent className="space-y-5 p-6">
                  <div>
                    <p className="app-kicker">{tier.name}</p>
                    <p className="mt-3 font-display text-4xl text-ink">
                      {tier.price}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">{tier.note}</p>
                  </div>
                  <ul className="grid gap-3 text-sm text-ink-soft">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="app-panel-brand px-6 py-7 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="app-kicker">{t("landing.contactEyebrow")}</p>
              <h2 className="font-display text-3xl text-ink sm:text-4xl">
                {t("landing.contactTitle")}
              </h2>
              <p className="text-base leading-7 text-ink-soft">
                {t("landing.contactBody")}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 px-6 text-base" size="lg">
                <Link href="mailto:help@fairsettle.co.uk">
                  {t("landing.contactEmail")}
                </Link>
              </Button>
              <Button
                asChild
                className="h-12 px-6 text-base"
                size="lg"
                variant="outline"
              >
                <Link href={getLocalizedPath(locale, "/register")}>
                  {t("landing.contactCta")}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
