"use client";

import { ArrowLeft, ArrowRight, PauseCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { SavingsBar } from "@/components/savings/SavingsBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatAnswerValue,
  getLocalizedMessage,
  type QuestionWithMeta,
} from "@/lib/questions";
import { getQuestionDisputeBadgeClassName } from "@/lib/questions/view";
import type { SavingsData } from "@/lib/savings/calculator";
import type { AnswerValue } from "@/lib/questions";

export function QuestionReviewList({
  canPause,
  currentSavings,
  errorMessage,
  isMultiPhaseV2,
  isSaving,
  locale,
  onBack,
  onEdit,
  onPause,
  onSubmit,
  questions,
  responses,
  submitLabel,
}: {
  canPause: boolean;
  currentSavings: SavingsData;
  errorMessage: string;
  isMultiPhaseV2: boolean;
  isSaving: boolean;
  locale: string;
  onBack: () => void;
  onEdit: (index: number) => void;
  onPause: () => void;
  onSubmit: () => void;
  questions: QuestionWithMeta[];
  responses: Record<string, AnswerValue>;
  submitLabel: string;
}) {
  const t = useTranslations();

  return (
    <>
      <Card className="app-panel border-brand/15">
        <CardContent className="space-y-3 p-6">
          <p className="app-kicker">{t("questionsFlow.fullReviewLabel")}</p>
          <p className="text-sm leading-6 text-ink-soft">
            {t("questionsFlow.finalReviewBody")}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {questions.map((question, index) => (
          <Card key={question.instance_key}>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="app-kicker">
                      {t("questions.questionOf", {
                        current: question.sequence,
                        total: questions.length,
                      })}
                    </p>
                    <Badge
                      className={getQuestionDisputeBadgeClassName(question.phase)}
                      variant="outline"
                    >
                      {t(`caseTypes.${question.phase}`)}
                    </Badge>
                    {question.child_label ? (
                      <Badge variant="secondary">{question.child_label}</Badge>
                    ) : null}
                  </div>
                  <h2 className="text-lg font-semibold text-ink">
                    {getLocalizedMessage(question.question_text, locale)}
                  </h2>
                </div>
                <Button type="button" variant="outline" onClick={() => onEdit(index)}>
                  {t("questionsFlow.edit")}
                </Button>
              </div>
              <p className="app-note bg-surface-soft px-4 py-3">
                {formatAnswerValue(responses[question.instance_key]) ||
                  t("questionsFlow.noAnswer")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {errorMessage ? <p className="app-alert-danger">{errorMessage}</p> : null}

      <div className="space-y-4">
        <SavingsBar snapshot={currentSavings} />
        <div className="grid gap-3 md:grid-cols-3">
          <Button className="h-12 rounded-full px-6" type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 size-4" />
            {t("questions.back")}
          </Button>

          {canPause ? (
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
          ) : null}

          <Button
            className="!h-12 min-h-12 text-base"
            disabled={isSaving}
            size="lg"
            type="button"
            onClick={onSubmit}
          >
            {submitLabel}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
