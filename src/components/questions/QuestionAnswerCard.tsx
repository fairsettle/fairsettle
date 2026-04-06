"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { QuestionRenderer } from "@/components/questions/QuestionRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AnswerValue, QuestionWithMeta } from "@/lib/questions";
import { getLocalizedMessage, hasAnswer } from "@/lib/questions";
import { getQuestionDisputeBadgeClassName } from "@/lib/questions/view";

export function QuestionAnswerCard({
  caseId,
  currentIndex,
  errorMessage,
  isSaving,
  locale,
  onBack,
  onContinue,
  onChange,
  question,
  totalQuestions,
  value,
}: {
  caseId: string;
  currentIndex: number;
  errorMessage: string;
  isSaving: boolean;
  locale: string;
  onBack: () => void;
  onContinue: () => void;
  onChange: (nextValue: unknown) => void;
  question: QuestionWithMeta;
  totalQuestions: number;
  value?: AnswerValue["value"];
}) {
  const t = useTranslations();

  return (
    <Card className="rounded-[2rem]">
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={getQuestionDisputeBadgeClassName(question.phase)}
            variant="outline"
          >
            {t(`caseTypes.${question.phase}`)}
          </Badge>
          {question.child_label ? (
            <Badge variant="secondary">{question.child_label}</Badge>
          ) : null}
          {question.question_type === "multi_choice" ? (
            <Badge variant="secondary">
              {t("questionsFlow.multiSelectHint")}
            </Badge>
          ) : null}
        </div>

        <QuestionRenderer
          caseId={caseId}
          locale={locale}
          question={question}
          value={value}
          onChange={onChange}
        />

        {errorMessage ? <p className="app-alert-danger">{errorMessage}</p> : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            className="h-12 rounded-full px-6"
            disabled={currentIndex === 0 || isSaving}
            type="button"
            variant="outline"
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 size-4" />
            {t("questions.back")}
          </Button>
          <Button
            className="h-12 flex-1 text-base"
            disabled={!hasAnswer({ value }) || isSaving}
            size="lg"
            type="button"
            onClick={onContinue}
          >
            {currentIndex === totalQuestions - 1
              ? t("questionsFlow.reviewCta")
              : t("questions.continue")}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
