"use client";

import { ArrowRight, Layers3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { CaseTypeSelector } from "@/components/cases/CaseTypeSelector";
import { PageHeader } from "@/components/layout/PageHeader";
import { SavingsBar } from "@/components/savings/SavingsBar";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/api-client";
import {
  readApiErrorMessage,
  resolveApiErrorMessage,
} from "@/lib/client-errors";
import { getLocalizedPath } from "@/lib/locale-path";
import type { CaseType } from "@/types/core";

export default function NewCasePage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const [selection, setSelection] = useState<CaseType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function toggleSelection(nextType: CaseType) {
    if (nextType === "combined") {
      setSelection((current) =>
        current.includes("combined") ? [] : ["combined"],
      );
      return;
    }

    setSelection((current) => {
      const withoutCombined = current.filter((item) => item !== "combined");

      if (withoutCombined.includes(nextType)) {
        return withoutCombined.filter((item) => item !== nextType);
      }

      return [...withoutCombined, nextType];
    });
  }

  function getCaseTypeToCreate(): CaseType | null {
    if (selection.length === 0) {
      return null;
    }

    if (selection.includes("combined") || selection.length > 1) {
      return "combined";
    }

    return selection[0] ?? null;
  }

  async function handleContinue() {
    const caseType = getCaseTypeToCreate();

    if (!caseType) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetchApi("/api/cases", locale, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ case_type: caseType }),
      });

      const data = (await response.json().catch(() => null)) as {
        case?: { id?: string };
        error?: string;
        redirect_to?: string | null;
      } | null;

      const nextCaseId = data?.case?.id;

      if (response.status === 409 && data?.redirect_to) {
        router.push(
          getLocalizedPath(
            locale,
            `${data.redirect_to}?redirect=${encodeURIComponent(`/cases/new`)}`,
          ),
        );
        return;
      }

      if (!response.ok || !nextCaseId) {
        setErrorMessage(
          resolveApiErrorMessage(
            data?.error ??
              (response.ok ? null : await readApiErrorMessage(response)),
            t("caseCreator.createError"),
          ),
        );
        return;
      }

      router.push(getLocalizedPath(locale, `/cases/${nextCaseId}/questions`));
    } catch {
      setErrorMessage(t("caseCreator.createError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell px-5 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          brandLabel={t("nav.brand")}
          eyebrow={t("caseCreator.title")}
          locale={locale}
          subtitle={t("caseCreator.subtitle")}
          title={t("caseCreator.heading")}
        />

        <CaseTypeSelector selection={selection} onToggle={toggleSelection} />

        {errorMessage ? (
          <p className="app-alert-danger">{errorMessage}</p>
        ) : null}

        <div className="space-y-4">
          <SavingsBar stage={0} />
          <Button
            className="h-12 w-full text-base"
            disabled={selection.length === 0 || isSubmitting}
            size="lg"
            type="button"
            onClick={handleContinue}
          >
            {t("caseCreator.continue")}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}
