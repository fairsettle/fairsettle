"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, PauseCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { SavingsBar } from "@/components/savings/SavingsBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SavingsData } from "@/lib/savings/calculator";
import type { QuestionReviewSummaryItem } from "@/types/questions";

export function QuestionPhaseTransitionCard({
  canInviteEarly,
  errorMessage,
  isSaving,
  onBack,
  onPause,
  onPrimary,
  primaryLabel,
  savings,
  summary,
  title,
  body,
}: {
  canInviteEarly: boolean;
  errorMessage: string;
  isSaving: boolean;
  onBack: () => void;
  onPause: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  savings: SavingsData;
  summary: QuestionReviewSummaryItem[];
  title: string;
  body: string;
}) {
  const t = useTranslations();

  return (
    <Card className="app-panel border-brand/15 bg-[linear-gradient(135deg,rgba(13,148,136,0.08),rgba(255,255,255,0.98))]">
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center text-brand">
              <CheckCircle2 className="size-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                {title}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-ink-soft">{body}</p>
            </div>
          </div>
          <div className="lg:w-[22rem]">
            <SavingsBar snapshot={savings} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {summary.map((item) => (
            <div
              key={item.label}
              className="rounded-[1.5rem] border border-line bg-white/85 px-5 py-4"
            >
              <p className="app-kicker">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{item.value}</p>
            </div>
          ))}
        </div>

        {canInviteEarly ? (
          <div className="app-note-brand px-5 py-4 text-sm leading-6">
            {t("questionsFlow.earlyInviteHint")}
          </div>
        ) : null}

        {errorMessage ? <p className="app-alert-danger">{errorMessage}</p> : null}

        <div className="grid gap-3 md:grid-cols-3">
          <Button className="h-12 rounded-full px-6" type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 size-4" />
            {t("questions.back")}
          </Button>
          <Button
            className="h-12"
            disabled={isSaving}
            size="lg"
            type="button"
            variant="outline"
            onClick={onPause}
          >
            <PauseCircle className="mr-2 size-4" />
            {t("questionsFlow.saveAndReturn")}
          </Button>
          <Button
            className="!h-12 min-h-12 text-base"
            disabled={isSaving}
            size="lg"
            type="button"
            onClick={onPrimary}
          >
            {primaryLabel}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
