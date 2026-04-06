"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Flag,
  ListChecks,
  PauseCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/PageHeader";
import { GuidanceBox } from "@/components/questions/GuidanceBox";
import { QuestionAnswerCard } from "@/components/questions/QuestionAnswerCard";
import { QuestionPhaseTransitionCard } from "@/components/questions/QuestionPhaseTransitionCard";
import { QuestionProgressBar } from "@/components/questions/ProgressBar";
import { QuestionRenderer } from "@/components/questions/QuestionRenderer";
import { QuestionReviewList } from "@/components/questions/QuestionReviewList";
import { SavingsBar } from "@/components/savings/SavingsBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchApi } from "@/lib/api-client";
import {
  readApiErrorMessage,
  resolveApiErrorMessage,
} from "@/lib/client-errors";
import { calculateQuestionFlowSavings } from "@/lib/savings/calculator";
import {
  formatAnswerValue,
  getLocalizedMessage,
  hasAnswer,
  type AnswerValue,
  type QuestionWithMeta,
} from "@/lib/questions";
import { getQuestionDisputeBadgeClassName } from "@/lib/questions/view";
import { getLocalizedPath } from "@/lib/locale-path";
import type { CasePhase, QuestionSetVersion, ViewerRole } from "@/types/core";
import type {
  QuestionReviewSummaryItem,
  QuestionsPayload,
  SavedResponse,
} from "@/types/questions";

function getInstanceKey(questionId: string, childId?: string | null) {
  return childId ? `${questionId}:${childId}` : questionId;
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
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [totalSections, setTotalSections] = useState(0);
  const [activePhase, setActivePhase] = useState<CasePhase>("child");
  const [phaseIndex, setPhaseIndex] = useState(1);
  const [phaseTotal, setPhaseTotal] = useState(1);
  const [completedPhases, setCompletedPhases] = useState<string[]>([]);
  const [canInviteEarly, setCanInviteEarly] = useState(false);
  const [questionSetVersion, setQuestionSetVersion] =
    useState<QuestionSetVersion>("v1");
  const [viewerRole, setViewerRole] = useState<ViewerRole>("initiator");
  const [hasResponder, setHasResponder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [waitingState, setWaitingState] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setIsLoading(true);
      setWaitingState(null);
      setErrorMessage("");

      try {
        const [questionsResponse, responsesResponse] = await Promise.all([
          fetchApi(`/api/cases/${caseId}/questions`, locale, {
            cache: "no-store",
          }),
          fetchApi(`/api/cases/${caseId}/responses`, locale, {
            cache: "no-store",
          }),
        ]);

        if (!questionsResponse.ok) {
          const questionErrorPayload = (await questionsResponse
            .json()
            .catch(() => null)) as {
            error?: string;
            redirect_to?: string | null;
            waiting_for_phase?: boolean;
          } | null;

          if (
            questionsResponse.status === 409 &&
            questionErrorPayload?.redirect_to
          ) {
            router.replace(
              getLocalizedPath(locale, questionErrorPayload.redirect_to),
            );
            return;
          }

          if (
            questionsResponse.status === 409 &&
            questionErrorPayload?.waiting_for_phase
          ) {
            if (!ignore) {
              setWaitingState(
                questionErrorPayload.error ??
                  t("questionsFlow.waitingForPhase"),
              );
              setQuestions([]);
            }
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
            getInstanceKey(response.question_id, response.child_id),
            response.answer_value,
          ]),
        ) as Record<string, AnswerValue>;

        const firstUnansweredIndex = flattenedQuestions.findIndex(
          (question) => !hasAnswer(responseMap[question.instance_key]),
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
          setIsReviewMode(
            nextIndex >= flattenedQuestions.length &&
              flattenedQuestions.length > 0,
          );
          setActivePhase(questionsPayload.active_phase);
          setPhaseIndex(questionsPayload.phase_index);
          setPhaseTotal(questionsPayload.phase_total);
          setCompletedPhases(questionsPayload.completed_phases);
          setCanInviteEarly(questionsPayload.can_invite_early);
          setQuestionSetVersion(questionsPayload.question_set_version);
          setViewerRole(questionsPayload.viewer_role);
          setHasResponder(questionsPayload.has_responder);
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
  }, [caseId, locale, reloadKey, router, t]);

  const isReviewing =
    (isReviewMode || currentIndex >= questions.length) && questions.length > 0;
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion
    ? responses[currentQuestion.instance_key]?.value
    : undefined;
  const reviewSummary: QuestionReviewSummaryItem[] = questions
    .slice(0, 4)
    .map((question) => ({
      label: getLocalizedMessage(question.question_text, locale),
      value:
        formatAnswerValue(responses[question.instance_key]) ||
        t("questionsFlow.noAnswer"),
    }));
  const currentSavings = calculateQuestionFlowSavings({
    phase: activePhase,
    sectionName: isReviewing
      ? questions.at(-1)?.section
      : currentQuestion?.section,
  });
  const isMultiPhaseV2 = questionSetVersion === "v2" && phaseTotal > 1;
  const isFinalPhase = phaseIndex === phaseTotal;
  const nextPhase =
    activePhase === "child"
      ? "financial"
      : activePhase === "financial"
        ? "asset"
        : null;
  const isInitiator = viewerRole === "initiator";
  const reviewSubmitLabel = isFinalPhase
    ? isInitiator && !hasResponder
      ? t("questionsFlow.submitAndInvite")
      : t("questionsFlow.submitAnswers")
    : canInviteEarly
      ? t("questionsFlow.inviteAfterPhase")
      : t("questionsFlow.continuePhase");
  const transitionCtaLabel =
    !isInitiator && !isFinalPhase
      ? t("questionsFlow.returnToDashboard")
      : canInviteEarly
        ? t("questionsFlow.inviteAfterPhase")
        : t("questionsFlow.continueToSpecificPhase", {
            phase: nextPhase ? t(`caseTypes.${nextPhase}`) : "",
          });

  function updateAnswer(nextValue: unknown) {
    if (!currentQuestion) {
      return;
    }

    setResponses((current) => ({
      ...current,
      [currentQuestion.instance_key]: {
        value: nextValue as AnswerValue["value"],
      },
    }));
  }

  async function saveCurrentAnswer() {
    if (!currentQuestion) {
      return false;
    }

    const answer = responses[currentQuestion.instance_key];

    if (!hasAnswer(answer)) {
      return false;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const response = await fetchApi(
        `/api/cases/${caseId}/responses`,
        locale,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question_id: currentQuestion.id,
            child_id: currentQuestion.child_id,
            answer_value: answer,
          }),
        },
      );

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
      setIsReviewMode(true);
      setCurrentIndex(questions.length);
      return;
    }

    setIsReviewMode(false);
    setCurrentIndex((current) => current + 1);
  }

  async function submitPhase(action: "continue" | "invite" | "pause") {
    setIsSaving(true);
    setErrorMessage("");

    try {
      const response = await fetchApi(
        `/api/cases/${caseId}/responses/submit`,
        locale,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        },
      );

      if (!response.ok) {
        throw new Error(
          resolveApiErrorMessage(
            await readApiErrorMessage(response),
            t("questionsFlow.submitError"),
          ),
        );
      }

      const payload = (await response.json()) as {
        status?: string;
        next_action?:
          | "comparison"
          | "invite"
          | "continue"
          | "pause"
          | "dashboard";
        waiting_for_next_phase?: boolean;
      };

      if (
        payload.status === "comparison" ||
        payload.next_action === "comparison"
      ) {
        setIsReviewMode(false);
        router.push(getLocalizedPath(locale, `/cases/${caseId}/comparison`));
        return;
      }

      if (action === "invite" || payload.next_action === "invite") {
        setIsReviewMode(false);
        router.push(getLocalizedPath(locale, `/cases/${caseId}/invite`));
        return;
      }

      if (action === "pause" || payload.waiting_for_next_phase) {
        setIsReviewMode(false);
        router.push(getLocalizedPath(locale, "/dashboard"));
        return;
      }

      if (payload.next_action === "dashboard") {
        setIsReviewMode(false);
        router.push(getLocalizedPath(locale, "/dashboard"));
        return;
      }

      setIsReviewMode(false);
      setReloadKey((current) => current + 1);
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
        <div className="mx-auto max-w-6xl">
          <PageHeader
            brandLabel={t("nav.brand")}
            locale={locale}
            subtitle={t("questionsFlow.loadingBody")}
            title={t("questionsFlow.loadingTitle")}
            titleClassName="text-3xl sm:text-4xl"
          />
        </div>
      </main>
    );
  }

  if (waitingState) {
    return (
      <main className=" px-5 py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <PageHeader
            brandLabel={t("nav.brand")}
            locale={locale}
            subtitle={waitingState}
            title={t("questionsFlow.waitingTitle")}
          />
          <Card className="app-panel">
            <CardContent className="space-y-4 p-6">
              <p className="text-sm leading-6 text-ink-soft">
                {t("questionsFlow.waitingBody")}
              </p>
              <Button asChild className="h-12" size="lg">
                <a href={getLocalizedPath(locale, "/dashboard")}>
                  {t("comparison.backToDashboard")}
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (errorMessage && questions.length === 0) {
    return (
      <main className=" px-5 py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <PageHeader
            brandLabel={t("nav.brand")}
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
        <div className="mx-auto max-w-6xl space-y-6">
          <PageHeader
            brandLabel={t("nav.brand")}
            locale={locale}
            subtitle={
              isMultiPhaseV2
                ? t(
                    isFinalPhase
                      ? "questionsFlow.phaseReviewBody"
                      : "questionsFlow.phaseCompleteBody",
                    {
                      count: questions.length,
                    },
                  )
                : t("questionsFlow.reviewBody")
            }
            title={
              isMultiPhaseV2
                ? t(
                    isFinalPhase
                      ? "questionsFlow.phaseReviewTitle"
                      : "questionsFlow.phaseCompleteTitle",
                    {
                      phase: t(`caseTypes.${activePhase}`),
                    },
                  )
                : t("questionsFlow.reviewTitle")
            }
          />

          {isMultiPhaseV2 && !isFinalPhase ? (
            <QuestionPhaseTransitionCard
              body={t("questionsFlow.phaseCompleteBody", {
                count: questions.length,
              })}
              canInviteEarly={canInviteEarly}
              errorMessage={errorMessage}
              isSaving={isSaving}
              onBack={() => {
                setIsReviewMode(false);
                setCurrentIndex(Math.max(questions.length - 1, 0));
              }}
              onPause={() => void submitPhase("pause")}
              onPrimary={() =>
                void submitPhase(
                  !isInitiator && !isFinalPhase
                    ? "pause"
                    : canInviteEarly
                      ? "invite"
                      : "continue",
                )
              }
              primaryLabel={transitionCtaLabel}
              savings={currentSavings}
              summary={reviewSummary}
              title={t("questionsFlow.phaseCompleteTitle", {
                phase: t(`caseTypes.${activePhase}`),
              })}
            />
          ) : (
            <QuestionReviewList
              canPause={isMultiPhaseV2}
              currentSavings={currentSavings}
              errorMessage={errorMessage}
              isMultiPhaseV2={isMultiPhaseV2}
              isSaving={isSaving}
              locale={locale}
              onBack={() => {
                setIsReviewMode(false);
                setCurrentIndex(Math.max(questions.length - 1, 0));
              }}
              onEdit={(index) => {
                setIsReviewMode(false);
                setCurrentIndex(index);
              }}
              onPause={() => void submitPhase("pause")}
              onSubmit={() =>
                void submitPhase(
                  canInviteEarly && !isFinalPhase ? "invite" : "continue",
                )
              }
              questions={questions}
              responses={responses}
              submitLabel={reviewSubmitLabel}
            />
          )}
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
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          brandLabel={t("nav.brand")}
          locale={locale}
          pretitle={
            <div className="space-y-3">
              <QuestionProgressBar
                currentQuestion={currentQuestion.sequence}
                currentSection={currentQuestion.section_index}
                phaseIndex={
                  questionSetVersion === "v2" ? phaseIndex : undefined
                }
                phaseLabel={
                  questionSetVersion === "v2"
                    ? t("questionsFlow.phaseBadge", {
                        current: phaseIndex,
                        total: phaseTotal,
                        phase: t(`caseTypes.${activePhase}`),
                      })
                    : undefined
                }
                phaseTotal={
                  questionSetVersion === "v2" ? phaseTotal : undefined
                }
                completedLabel={
                  questionSetVersion === "v2" && completedPhases.length > 0
                    ? t("questionsFlow.completedPhases", {
                        count: completedPhases.length,
                      })
                    : undefined
                }
                sectionName={currentQuestion.section}
                totalQuestions={questions.length}
                totalSections={totalSections}
              />
            </div>
          }
          title={getLocalizedMessage(currentQuestion.question_text, locale)}
          titleClassName="max-w-3xl"
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <QuestionAnswerCard
            caseId={caseId}
            currentIndex={currentIndex}
            errorMessage={errorMessage}
            isSaving={isSaving}
            locale={locale}
            onBack={() => {
              setIsReviewMode(false);
              setCurrentIndex((current) => Math.max(current - 1, 0));
            }}
            onChange={updateAnswer}
            onContinue={() => void handleContinue()}
            question={currentQuestion}
            totalQuestions={questions.length}
            value={currentAnswer}
          />

          <div className="space-y-4">
            {guidanceText ? <GuidanceBox body={guidanceText} /> : null}
            <SavingsBar snapshot={currentSavings} />
          </div>
        </div>
      </div>
    </main>
  );
}
