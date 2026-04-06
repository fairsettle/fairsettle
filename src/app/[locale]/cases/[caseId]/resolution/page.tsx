"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { AsyncStateCard } from "@/components/feedback/AsyncStateCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { SuggestionCard } from "@/components/resolution/SuggestionCard";
import { SavingsBar } from "@/components/savings/SavingsBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchApi } from "@/lib/api-client";
import {
  readApiErrorMessage,
  resolveApiErrorMessage,
} from "@/lib/client-errors";
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
          fetchApi(`/api/cases/${caseId}/resolution`, locale, {
            cache: "no-store",
          }),
          fetchApi(`/api/cases/${caseId}/comparison`, locale, {
            cache: "no-store",
          }),
        ]);

        if (!resolutionResponse.ok) {
          throw new Error(
            resolveApiErrorMessage(
              await readApiErrorMessage(resolutionResponse),
              t("resolution.loadError"),
            ),
          );
        }

        if (!comparisonResponse.ok) {
          throw new Error(
            resolveApiErrorMessage(
              await readApiErrorMessage(comparisonResponse),
              t("resolution.loadError"),
            ),
          );
        }

        const resolutionPayload =
          (await resolutionResponse.json()) as ResolutionPayload & {
            viewer_role?: "initiator" | "responder";
          };
        const comparisonPayload = (await comparisonResponse.json()) as {
          viewer_role?: "initiator" | "responder";
        };

        if (!ignore) {
          setSuggestions(resolutionPayload.suggestions ?? []);
          setViewerRole(
            resolutionPayload.viewer_role ??
              comparisonPayload.viewer_role ??
              "initiator",
          );
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            error instanceof Error && error.message
              ? error.message
              : t("resolution.loadError"),
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

  async function handleDecisionSaved(
    suggestion: ResolutionSuggestion,
    action: "accept" | "modify" | "reject",
    modifiedValue?: unknown,
  ) {
    const response = await fetchApi(
      `/api/cases/${caseId}/resolution/${suggestion.question_id}`,
      locale,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          child_id: suggestion.child_id,
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
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          brandLabel={t("nav.brand")}
          eyebrow={t("resolution.eyebrow")}
          locale={locale}
          subtitle={t("resolution.subtitle")}
          title={t("resolution.title")}
        />

        <Card className="app-panel">
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

        <Card className="app-panel border-brand/15">
          <CardContent className="space-y-2 p-6">
            <p className="app-kicker">{t("resolution.nextStepLabel")}</p>
            <p className="text-sm leading-6 text-ink-soft">
              {t("resolution.nextStepBody")}
            </p>
          </CardContent>
        </Card>

        {isLoading ? (
          <AsyncStateCard
            body={t("resolution.subtitle")}
            title={t("resolution.loading")}
          />
        ) : errorMessage ? (
          <Card className="app-panel">
            <CardContent className="p-6 text-sm text-danger">
              {errorMessage}
            </CardContent>
          </Card>
        ) : suggestions.length === 0 ? (
          <Card className="app-panel">
            <CardContent className="p-6 text-sm text-ink-soft">
              {t("resolution.empty")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.item_key}
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
