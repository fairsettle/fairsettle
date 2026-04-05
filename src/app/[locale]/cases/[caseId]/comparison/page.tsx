"use client";

import Link from "next/link";
import { ArrowRight, Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { AgreementSummary } from "@/components/comparison/AgreementSummary";
import { CaseTimeline } from "@/components/comparison/CaseTimeline";
import { ComparisonTable } from "@/components/comparison/ComparisonTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { SavingsBar } from "@/components/savings/SavingsBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLocalizedPath } from "@/lib/locale-path";
import type { SafeComparisonPayload } from "@/lib/comparison";

interface TimelinePayload {
  events: Array<{
    event_type: string;
    event_data: Record<string, unknown>;
    created_at: string;
    display_time: string;
  }>;
}

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
        const comparisonResponse = await fetch(
          `/api/cases/${caseId}/comparison`,
          {
            cache: "no-store",
          },
        );

        if (!comparisonResponse.ok) {
          throw new Error(
            comparisonResponse.status === 409
              ? "comparison_not_ready"
              : "comparison_failed",
          );
        }

        const timelineResponse = await fetch(`/api/cases/${caseId}/timeline`, {
          cache: "no-store",
        });

        if (!timelineResponse.ok) {
          throw new Error("timeline_failed");
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
  }, [caseId, t]);

  return (
    <main className=" px-5 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          brandLabel={t("nav.brand")}
          eyebrow={t("comparison.eyebrow")}
          icon={Scale}
          locale={locale}
          subtitle={t("comparison.subtitle")}
          title={t("comparison.title")}
        />

        {isLoading ? (
          <Card className="app-panel shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
            <CardContent className="p-6 text-sm text-ink-soft">
              {t("comparison.loading")}
            </CardContent>
          </Card>
        ) : errorMessage || !comparison ? (
          <Card className="app-panel shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
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
            <Card className="app-panel border-brand/15 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
              <CardContent className="space-y-2 p-6">
                <p className="app-kicker">{t("comparison.nextStepLabel")}</p>
                <p className="text-sm leading-6 text-ink-soft">
                  {t("comparison.nextStepBody")}
                </p>
              </CardContent>
            </Card>
            <AgreementSummary
              agreedCount={comparison.summary.agreed_count}
              gapCount={comparison.summary.gap_count}
            />
            <ComparisonTable
              items={comparison.items}
              viewerRole={comparison.viewer_role}
            />
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
