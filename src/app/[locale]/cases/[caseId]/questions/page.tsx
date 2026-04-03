"use client";

import { ArrowLeft, ArrowRight, ListChecks } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/PageHeader";
import { GuidanceBox } from "@/components/questions/GuidanceBox";
import { QuestionProgressBar } from "@/components/questions/ProgressBar";
import { QuestionRenderer } from "@/components/questions/QuestionRenderer";
import { SavingsBar } from "@/components/savings/SavingsBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  readApiErrorMessage,
  resolveApiErrorMessage,
} from "@/lib/client-errors";
import {
  formatAnswerValue,
  getLocalizedMessage,
  hasAnswer,
  type AnswerValue,
  type QuestionSection,
  type QuestionWithMeta,
} from "@/lib/questions";
import { getLocalizedPath } from "@/lib/locale-path";

interface QuestionsPayload {
  sections: QuestionSection[];
  total_questions: number;
  total_sections: number;
}

interface SavedResponse {
  question_id: string;
  answer_value: AnswerValue;
}

export default function QuestionsPage({
  params: { caseId },
}: {
  params: { caseId: string };
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const [questions, setQuestions] = useState<QuestionWithMeta[]>([]);
  const [responses, setResponses] = useState<Record<string, AnswerValue>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalSections, setTotalSections] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [questionsResponse, responsesResponse] = await Promise.all([
          fetch(`/api/cases/${caseId}/questions`, { cache: "no-store" }),
          fetch(`/api/cases/${caseId}/responses`, { cache: "no-store" }),
        ]);

        if (!questionsResponse.ok) {
          const questionErrorPayload = (await questionsResponse
            .json()
            .catch(() => null)) as {
            error?: string;
            redirect_to?: string | null;
          } | null;

          if (
            questionsResponse.status === 409 &&
            questionErrorPayload?.redirect_to
          ) {
            router.replace(getLocalizedPath(locale, questionErrorPayload.redirect_to));
            return;
          }

          throw new Error(
            resolveApiErrorMessage(
              questionErrorPayload?.error ??
                (await readApiErrorMessage(questionsResponse)),
              t("questionsFlow.loadError"),
            ),
          );
        }

        if (!responsesResponse.ok) {
          throw new Error(
            resolveApiErrorMessage(
              await readApiErrorMessage(responsesResponse),
              t("questionsFlow.loadError"),
            ),
          );
        }

        const questionsPayload =
          (await questionsResponse.json()) as QuestionsPayload;
        const responsesPayload = (await responsesResponse.json()) as {
          responses: SavedResponse[];
        };
        const flattenedQuestions = questionsPayload.sections.flatMap(
          (section) => section.questions,
        );
        const responseMap = Object.fromEntries(
          (responsesPayload.responses ?? []).map((response) => [
            response.question_id,
            response.answer_value,
          ]),
        ) as Record<string, AnswerValue>;

        const firstUnansweredIndex = flattenedQuestions.findIndex(
          (question) => !hasAnswer(responseMap[question.id]),
        );
        const nextIndex =
          firstUnansweredIndex === -1
            ? flattenedQuestions.length
            : firstUnansweredIndex;

        if (!ignore) {
          setQuestions(flattenedQuestions);
          setResponses(responseMap);
          setTotalSections(questionsPayload.total_sections);
          setCurrentIndex(nextIndex);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            error instanceof Error && error.message
              ? error.message
              : t("questionsFlow.loadError"),
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
  }, [caseId, locale, router, t]);

  const isReviewing = currentIndex >= questions.length && questions.length > 0;
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion
    ? responses[currentQuestion.id]?.value
    : undefined;

  function updateAnswer(nextValue: unknown) {
    if (!currentQuestion) {
      return;
    }

    setResponses((current) => ({
      ...current,
      [currentQuestion.id]: { value: nextValue as AnswerValue["value"] },
    }));
  }

  async function saveCurrentAnswer() {
    if (!currentQuestion) {
      return false;
    }

    const answer = responses[currentQuestion.id];

    if (!hasAnswer(answer)) {
      return false;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/cases/${caseId}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          answer_value: answer,
        }),
      });

      if (!response.ok) {
        throw new Error(
          resolveApiErrorMessage(
            await readApiErrorMessage(response),
            t("questionsFlow.saveError"),
          ),
        );
      }

      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : t("questionsFlow.saveError"),
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleContinue() {
    const saved = await saveCurrentAnswer();

    if (!saved) {
      return;
    }

    if (currentIndex === questions.length - 1) {
      setCurrentIndex(questions.length);
      return;
    }

    setCurrentIndex((current) => current + 1);
  }

  async function handleSubmitAll() {
    setIsSaving(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/cases/${caseId}/responses/submit`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          resolveApiErrorMessage(
            await readApiErrorMessage(response),
            t("questionsFlow.submitError"),
          ),
        );
      }

      const payload = (await response.json()) as { status?: string };
      const nextPath =
        payload.status === "comparison"
          ? `/cases/${caseId}/comparison`
          : `/cases/${caseId}/invite`;

      router.push(getLocalizedPath(locale, nextPath));
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : t("questionsFlow.submitError"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className=" px-5 py-6">
        <div className="mx-auto max-w-5xl">
          <PageHeader
            brandLabel={t("nav.brand")}
            icon={ListChecks}
            locale={locale}
            subtitle={t("questionsFlow.loadingBody")}
            title={t("questionsFlow.loadingTitle")}
            titleClassName="text-3xl sm:text-4xl"
          />
        </div>
      </main>
    );
  }

  if (errorMessage && questions.length === 0) {
    return (
      <main className=" px-5 py-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <PageHeader
            brandLabel={t("nav.brand")}
            icon={ListChecks}
            locale={locale}
            title={t("questionsFlow.loadingTitle")}
            titleClassName="text-3xl sm:text-4xl"
          />
          <p className="app-alert-danger mt-6">{errorMessage}</p>
        </div>
      </main>
    );
  }

  if (isReviewing) {
    return (
      <main className=" px-5 py-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <PageHeader
            brandLabel={t("nav.brand")}
            icon={ListChecks}
            locale={locale}
            subtitle={t("questionsFlow.reviewBody")}
            title={t("questionsFlow.reviewTitle")}
          />

          <div className="grid gap-4">
            {questions.map((question, index) => (
              <Card key={question.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="app-kicker">
                        {t("questions.questionOf", {
                          current: question.sequence,
                          total: questions.length,
                        })}
                      </p>
                      <h2 className="text-lg font-semibold text-ink">
                        {getLocalizedMessage(question.question_text, locale)}
                      </h2>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentIndex(index)}
                    >
                      {t("questionsFlow.edit")}
                    </Button>
                  </div>
                  <p className="app-note bg-surface-soft px-4 py-3">
                    {formatAnswerValue(responses[question.id]) ||
                      t("questionsFlow.noAnswer")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {errorMessage ? (
            <p className="app-alert-danger">{errorMessage}</p>
          ) : null}

          <div className="space-y-4">
            <SavingsBar stage={1} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="h-12 rounded-full px-6"
                type="button"
                variant="outline"
                onClick={() =>
                  setCurrentIndex(Math.max(questions.length - 1, 0))
                }
              >
                <ArrowLeft className="mr-2 size-4" />
                {t("questions.back")}
              </Button>
              <Button
                className="!h-12 min-h-12 flex-1 text-base"
                disabled={isSaving}
                size="lg"
                type="button"
                onClick={handleSubmitAll}
              >
                {t("questionsFlow.submit")}
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const guidanceText = getLocalizedMessage(
    currentQuestion.guidance_text,
    locale,
  );

  return (
    <main className=" px-5 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          brandLabel={t("nav.brand")}
          icon={ListChecks}
          locale={locale}
          pretitle={
            <QuestionProgressBar
              currentQuestion={currentQuestion.sequence}
              currentSection={currentQuestion.section_index}
              sectionName={currentQuestion.section}
              totalQuestions={questions.length}
              totalSections={totalSections}
            />
          }
          title={getLocalizedMessage(currentQuestion.question_text, locale)}
          titleClassName="max-w-3xl"
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card className="rounded-[2rem]">
            <CardContent className="space-y-6 p-6">
              <QuestionRenderer
                caseId={caseId}
                locale={locale}
                question={currentQuestion}
                value={currentAnswer}
                onChange={updateAnswer}
              />

              {errorMessage ? (
                <p className="app-alert-danger">{errorMessage}</p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  className="h-12 rounded-full px-6"
                  disabled={currentIndex === 0 || isSaving}
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setCurrentIndex((current) => Math.max(current - 1, 0))
                  }
                >
                  <ArrowLeft className="mr-2 size-4" />
                  {t("questions.back")}
                </Button>
                <Button
                  className="h-12 flex-1 text-base"
                  disabled={
                    !hasAnswer(responses[currentQuestion.id]) || isSaving
                  }
                  size="lg"
                  type="button"
                  onClick={handleContinue}
                >
                  {currentIndex === questions.length - 1
                    ? t("questionsFlow.reviewCta")
                    : t("questions.continue")}
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {guidanceText ? <GuidanceBox body={guidanceText} /> : null}
            <SavingsBar stage={1} />
          </div>
        </div>
      </div>
    </main>
  );
}
