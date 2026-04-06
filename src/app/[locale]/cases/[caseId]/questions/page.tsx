"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Flag, ListChecks, PauseCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/PageHeader";
import { GuidanceBox } from "@/components/questions/GuidanceBox";
import { QuestionProgressBar } from "@/components/questions/ProgressBar";
import { QuestionRenderer } from "@/components/questions/QuestionRenderer";
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
  type CasePhase,
  type QuestionSection,
  type QuestionWithMeta,
} from "@/lib/questions";
import { getLocalizedPath } from "@/lib/locale-path";

interface QuestionsPayload {
  sections: QuestionSection[];
  total_questions: number;
  total_sections: number;
  active_phase: CasePhase;
  phase_index: number;
  phase_total: number;
  completed_phases: string[];
  can_invite_early: boolean;
  question_set_version: "v1" | "v2";
  viewer_role: "initiator" | "responder";
  has_responder: boolean;
}

interface SavedResponse {
  question_id: string;
  child_id: string | null;
  answer_value: AnswerValue;
}

function getDisputeBadgeClassName(phase: CasePhase) {
  if (phase === "child") {
    return "border-brand/15 bg-brand-soft text-brand-strong";
  }

  if (phase === "financial") {
    return "border-warning/15 bg-warning-soft text-warning-foreground";
  }

  return "border-line bg-surface-soft text-ink";
}

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
  const [questionSetVersion, setQuestionSetVersion] = useState<"v1" | "v2">("v1");
  const [viewerRole, setViewerRole] = useState<"initiator" | "responder">("initiator");
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
          fetchApi(`/api/cases/${caseId}/questions`, locale, { cache: "no-store" }),
          fetchApi(`/api/cases/${caseId}/responses`, locale, { cache: "no-store" }),
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
            router.replace(getLocalizedPath(locale, questionErrorPayload.redirect_to));
            return;
          }

          if (
            questionsResponse.status === 409 &&
            questionErrorPayload?.waiting_for_phase
          ) {
            if (!ignore) {
              setWaitingState(questionErrorPayload.error ?? t("questionsFlow.waitingForPhase"));
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
          setIsReviewMode(nextIndex >= flattenedQuestions.length && flattenedQuestions.length > 0);
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
  const reviewSummary = questions.slice(0, 4).map((question) => ({
    label: getLocalizedMessage(question.question_text, locale),
    value:
      formatAnswerValue(responses[question.instance_key]) ||
      t("questionsFlow.noAnswer"),
  }));
  const currentSavings = calculateQuestionFlowSavings({
    phase: activePhase,
    sectionName: isReviewing ? questions.at(-1)?.section : currentQuestion?.section,
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
      [currentQuestion.instance_key]: { value: nextValue as AnswerValue["value"] },
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
      const response = await fetchApi(`/api/cases/${caseId}/responses`, locale, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          child_id: currentQuestion.child_id,
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
      const response = await fetchApi(`/api/cases/${caseId}/responses/submit`, locale, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

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
        next_action?: "comparison" | "invite" | "continue" | "pause" | "dashboard";
        waiting_for_next_phase?: boolean;
      };

      if (payload.status === "comparison" || payload.next_action === "comparison") {
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

  if (waitingState) {
    return (
      <main className=" px-5 py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <PageHeader
            brandLabel={t("nav.brand")}
            icon={Flag}
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
        <div className="mx-auto max-w-6xl space-y-6">
          <PageHeader
            brandLabel={t("nav.brand")}
            icon={ListChecks}
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
            <Card className="app-panel border-brand/15 bg-[linear-gradient(135deg,rgba(13,148,136,0.08),rgba(255,255,255,0.98))]">
              <CardContent className="space-y-6 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-4">
                    <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
                      <CheckCircle2 className="size-6" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-semibold tracking-tight text-ink">
                        {t("questionsFlow.phaseCompleteTitle", {
                          phase: t(`caseTypes.${activePhase}`),
                        })}
                      </h2>
                      <p className="max-w-2xl text-sm leading-6 text-ink-soft">
                        {t("questionsFlow.phaseCompleteBody", {
                          count: questions.length,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="lg:w-[22rem]">
                    <SavingsBar snapshot={currentSavings} />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {reviewSummary.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[1.5rem] border border-line bg-white/85 px-5 py-4"
                    >
                      <p className="app-kicker">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-ink-soft">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {canInviteEarly ? (
                  <div className="app-note-brand px-5 py-4 text-sm leading-6">
                    {t("questionsFlow.earlyInviteHint")}
                  </div>
                ) : null}

                {errorMessage ? (
                  <p className="app-alert-danger">{errorMessage}</p>
                ) : null}

                <div className="grid gap-3 md:grid-cols-3">
                  <Button
                    className="h-12 rounded-full px-6"
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsReviewMode(false);
                      setCurrentIndex(Math.max(questions.length - 1, 0));
                    }}
                  >
                    <ArrowLeft className="mr-2 size-4" />
                    {t("questions.back")}
                  </Button>
                  <Button
                    className="h-12"
                    disabled={isSaving}
                    size="lg"
                    type="button"
                    variant="outline"
                    onClick={() => void submitPhase("pause")}
                  >
                    <PauseCircle className="mr-2 size-4" />
                    {t("questionsFlow.saveAndReturn")}
                  </Button>
                  <Button
                    className="!h-12 min-h-12 text-base"
                    disabled={isSaving}
                    size="lg"
                    type="button"
                    onClick={() =>
                      void submitPhase(
                        !isInitiator && !isFinalPhase
                          ? "pause"
                          : canInviteEarly
                            ? "invite"
                            : "continue",
                      )
                    }
                  >
                    {transitionCtaLabel}
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
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
                              className={getDisputeBadgeClassName(question.phase)}
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
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsReviewMode(false);
                            setCurrentIndex(index);
                          }}
                        >
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

              {errorMessage ? (
                <p className="app-alert-danger">{errorMessage}</p>
              ) : null}

              <div className="space-y-4">
                <SavingsBar snapshot={currentSavings} />
                <div className="grid gap-3 md:grid-cols-3">
                  <Button
                    className="h-12 rounded-full px-6"
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsReviewMode(false);
                      setCurrentIndex(Math.max(questions.length - 1, 0));
                    }}
                  >
                    <ArrowLeft className="mr-2 size-4" />
                    {t("questions.back")}
                  </Button>

                  {isMultiPhaseV2 ? (
                    <Button
                      className="h-12"
                      disabled={isSaving}
                      size="lg"
                      type="button"
                      variant="outline"
                      onClick={() => void submitPhase("pause")}
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
                    onClick={() =>
                      void submitPhase(
                        canInviteEarly && !isFinalPhase ? "invite" : "continue",
                      )
                    }
                  >
                    {reviewSubmitLabel}
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </div>
              </div>
            </>
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
          icon={ListChecks}
          locale={locale}
          pretitle={
            <div className="space-y-3">
              <QuestionProgressBar
                currentQuestion={currentQuestion.sequence}
                currentSection={currentQuestion.section_index}
                phaseIndex={questionSetVersion === "v2" ? phaseIndex : undefined}
                phaseLabel={
                  questionSetVersion === "v2"
                    ? t("questionsFlow.phaseBadge", {
                        current: phaseIndex,
                        total: phaseTotal,
                        phase: t(`caseTypes.${activePhase}`),
                      })
                    : undefined
                }
                phaseTotal={questionSetVersion === "v2" ? phaseTotal : undefined}
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
          <Card className="rounded-[2rem]">
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={getDisputeBadgeClassName(currentQuestion.phase)}
                  variant="outline"
                >
                  {t(`caseTypes.${currentQuestion.phase}`)}
                </Badge>
                {currentQuestion.child_label ? (
                  <Badge variant="secondary">{currentQuestion.child_label}</Badge>
                ) : null}
                {currentQuestion.question_type === "multi_choice" ? (
                  <Badge variant="secondary">
                    {t("questionsFlow.multiSelectHint")}
                  </Badge>
                ) : null}
              </div>

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
                  onClick={() => {
                    setIsReviewMode(false);
                    setCurrentIndex((current) => Math.max(current - 1, 0));
                  }}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  {t("questions.back")}
                </Button>
                <Button
                  className="h-12 flex-1 text-base"
                  disabled={
                    !hasAnswer(responses[currentQuestion.instance_key]) || isSaving
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
            <SavingsBar snapshot={currentSavings} />
          </div>
        </div>
      </div>
    </main>
  );
}
