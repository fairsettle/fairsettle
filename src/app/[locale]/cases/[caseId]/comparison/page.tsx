"use client";

import Link from "next/link";
import { ArrowRight, Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { AiDisclosure } from "@/components/ai/AiDisclosure";
import { AgreementSummary } from "@/components/comparison/AgreementSummary";
import { CaseTimeline } from "@/components/comparison/CaseTimeline";
import { ComparisonTable } from "@/components/comparison/ComparisonTable";
import { AsyncStateCard } from "@/components/feedback/AsyncStateCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { SavingsBar } from "@/components/savings/SavingsBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchApi } from "@/lib/api-client";
import {
  readApiErrorMessage,
  resolveApiErrorMessage,
} from "@/lib/client-errors";
import { getLocalizedPath } from "@/lib/locale-path";
import type { SafeComparisonPayload } from "@/lib/comparison";
import type { TimelinePayload } from "@/types/timeline";

export default function ComparisonPage({
  params: { caseId },
}: {
  params: { caseId: string };
}) {
  const locale = useLocale();
  const t = useTranslations();
  const [comparison, setComparison] = useState<SafeComparisonPayload | null>(
    null,
  );
  const [timeline, setTimeline] = useState<TimelinePayload["events"]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const comparisonResponse = await fetchApi(
          `/api/cases/${caseId}/comparison?locale=${locale}`,
          locale,
          {
            cache: "no-store",
          },
        );

        if (!comparisonResponse.ok) {
          throw new Error(
            comparisonResponse.status === 403 ||
              comparisonResponse.status === 409
              ? "comparison_not_ready"
              : resolveApiErrorMessage(
                  await readApiErrorMessage(comparisonResponse),
                  t("comparison.loadError"),
                ),
          );
        }

        const timelineResponse = await fetchApi(
          `/api/cases/${caseId}/timeline`,
          locale,
          {
            cache: "no-store",
          },
        );

        if (!timelineResponse.ok) {
          throw new Error(
            resolveApiErrorMessage(
              await readApiErrorMessage(timelineResponse),
              t("comparison.loadError"),
            ),
          );
        }

        const comparisonPayload =
          (await comparisonResponse.json()) as SafeComparisonPayload;
        const timelinePayload =
          (await timelineResponse.json()) as TimelinePayload;

        if (!ignore) {
          setComparison(comparisonPayload);
          setTimeline(timelinePayload.events ?? []);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            error instanceof Error && error.message === "comparison_not_ready"
              ? t("comparison.notReady")
              : error instanceof Error && error.message
                ? error.message
                : t("comparison.loadError"),
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      ignore = true;
    };
  }, [caseId, locale, t]);

  return (
    <main className=" px-5 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          brandLabel={t("nav.brand")}
          eyebrow={t("comparison.eyebrow")}
          locale={locale}
          subtitle={t("comparison.subtitle")}
          title={t("comparison.title")}
        />

        {isLoading ? (
          <AsyncStateCard
            body={t("comparison.subtitle")}
            title={t("comparison.loading")}
          />
        ) : errorMessage || !comparison ? (
          <Card className="app-panel">
            <CardContent className="space-y-4 p-6">
              <p className="text-sm text-danger">
                {errorMessage || t("comparison.loadError")}
              </p>
              <p className="text-sm leading-6 text-ink-soft">
                {t("comparison.notReadyHint")}
              </p>
              <Button asChild className="h-12 px-6" size="lg" variant="outline">
                <Link href={getLocalizedPath(locale, "/dashboard")}>
                  {t("comparison.backToDashboard")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="app-panel border-brand/15">
              <CardContent className="space-y-3 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="app-kicker">
                      {t("comparison.nextStepLabel")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      {t("comparison.nextStepBody")}
                    </p>
                  </div>
                  <div className="app-note-brand min-w-[12rem] px-4 py-3 text-sm">
                    <p className="font-semibold text-ink">
                      {comparison.summary.reviewed_count}/
                      {comparison.summary.total_compared}
                    </p>
                    <p className="mt-1 text-ink-soft">
                      {t("comparison.progressLabel")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <AgreementSummary
              agreedCount={comparison.summary.agreed_count}
              gapCount={comparison.summary.gap_count}
            />
            <Tabs className="gap-4" defaultValue="to_review">
              <TabsList
                className="grid h-auto grid-cols-4 gap-2 p-2"
                variant="line"
              >
                <TabsTrigger className="h-12" value="to_review">
                  {t("comparison.toReviewTab", {
                    count: comparison.summary.to_review_count,
                  })}
                </TabsTrigger>
                <TabsTrigger className="h-12" value="agreed">
                  {t("comparison.agreedTab", {
                    count:
                      comparison.summary.agreed_count +
                      comparison.summary.locked_count,
                  })}
                </TabsTrigger>
                <TabsTrigger className="h-12" value="disputed">
                  {t("comparison.disputedTab", {
                    count:
                      comparison.summary.disputed_count +
                      comparison.summary.unresolved_count,
                  })}
                </TabsTrigger>
                <TabsTrigger className="h-12" value="summary">
                  {t("comparison.summaryTab")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="to_review">
                <ComparisonTable
                  items={comparison.items.filter(
                    (item) => item.review_bucket === "to_review",
                  )}
                  viewerRole={comparison.viewer_role}
                />
              </TabsContent>

              <TabsContent value="agreed">
                <ComparisonTable
                  items={comparison.items.filter((item) =>
                    ["agreed", "locked"].includes(item.review_bucket),
                  )}
                  viewerRole={comparison.viewer_role}
                />
              </TabsContent>

              <TabsContent value="disputed">
                <ComparisonTable
                  items={comparison.items.filter((item) =>
                    ["disputed", "unresolved"].includes(item.review_bucket),
                  )}
                  viewerRole={comparison.viewer_role}
                />
              </TabsContent>

              <TabsContent value="summary">
                <Card className="app-panel">
                  <CardContent className="space-y-4 p-6">
                    {comparison.ai_disclaimer ? (
                      <AiDisclosure
                        body={comparison.ai_disclaimer}
                        title={t("ai.label")}
                      />
                    ) : null}
                    <div>
                      <p className="app-kicker">{t("comparison.summaryTab")}</p>
                      <p className="mt-3 text-sm leading-6 text-ink-soft">
                        {comparison.narrative_summary ??
                          t("comparison.summaryUnavailable")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            <CaseTimeline events={timeline} />
            <SavingsBar stage={3} />
            <Button asChild className="h-12 w-full text-base" size="lg">
              <Link
                href={getLocalizedPath(locale, `/cases/${caseId}/resolution`)}
              >
                {t("comparison.seeOutcomes")}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
