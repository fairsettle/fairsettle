"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/PageHeader";
import { SuggestionCard } from "@/components/resolution/SuggestionCard";
import { SavingsBar } from "@/components/savings/SavingsBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLocalizedPath } from "@/lib/locale-path";
import type {
  ResolutionPayload,
  ResolutionSuggestion,
} from "@/lib/resolution/types";

export default function ResolutionPage({
  params: { caseId },
}: {
  params: { caseId: string };
}) {
  const locale = useLocale();
  const t = useTranslations();
  const [suggestions, setSuggestions] = useState<ResolutionSuggestion[]>([]);
  const [viewerRole, setViewerRole] = useState<"initiator" | "responder">(
    "initiator",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [resolutionResponse, comparisonResponse] = await Promise.all([
          fetch(`/api/cases/${caseId}/resolution`, { cache: "no-store" }),
          fetch(`/api/cases/${caseId}/comparison`, { cache: "no-store" }),
        ]);

        if (!resolutionResponse.ok) {
          throw new Error("resolution_failed");
        }

        if (!comparisonResponse.ok) {
          throw new Error("comparison_failed");
        }

        const resolutionPayload =
          (await resolutionResponse.json()) as ResolutionPayload;
        const comparisonPayload = (await comparisonResponse.json()) as {
          viewer_role?: "initiator" | "responder";
        };

        if (!ignore) {
          setSuggestions(resolutionPayload.suggestions ?? []);
          setViewerRole(comparisonPayload.viewer_role ?? "initiator");
        }
      } catch {
        if (!ignore) {
          setErrorMessage(t("resolution.loadError"));
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

  async function handleDecisionSaved(
    questionId: string,
    action: "accept" | "modify" | "reject",
    modifiedValue?: string,
  ) {
    const response = await fetch(
      `/api/cases/${caseId}/resolution/${questionId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          modified_value: modifiedValue,
        }),
      },
    );

    if (!response.ok) {
      throw new Error("resolution_save_failed");
    }
  }

  return (
    <main className=" px-5 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          brandLabel={t("nav.brand")}
          eyebrow={t("resolution.eyebrow")}
          icon={ShieldCheck}
          locale={locale}
          subtitle={t("resolution.subtitle")}
          title={t("resolution.title")}
        />

        <Card className="app-panel shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
          <CardContent className="p-6">
            <Button asChild className="h-12" size="lg" variant="outline">
              <Link
                href={getLocalizedPath(locale, `/cases/${caseId}/comparison`)}
              >
                <ArrowLeft className="mr-2 size-4" />
                {t("resolution.backToComparison")}
              </Link>
            </Button>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className="app-panel shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
            <CardContent className="p-6 text-sm text-ink-soft">
              {t("resolution.loading")}
            </CardContent>
          </Card>
        ) : errorMessage ? (
          <Card className="app-panel shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
            <CardContent className="p-6 text-sm text-danger">
              {errorMessage}
            </CardContent>
          </Card>
        ) : suggestions.length === 0 ? (
          <Card className="app-panel shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
            <CardContent className="p-6 text-sm text-ink-soft">
              {t("resolution.empty")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.question_id}
                suggestion={suggestion}
                viewerRole={viewerRole}
                onDecisionSaved={handleDecisionSaved}
              />
            ))}
          </div>
        )}

        <div className="space-y-4">
          <SavingsBar stage={3} />
          <Button asChild className="h-12 w-full text-base" size="lg">
            <Link href={getLocalizedPath(locale, `/cases/${caseId}/export`)}>
              {t("resolution.exportCta")}
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
