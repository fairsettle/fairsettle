import type { Json, Database } from "@/types/database";

import {
  calculateChildAge,
  formatChildLabel,
  getCasePhases,
  makeItemKey,
  type ChildRow,
} from "@/lib/family-profile";
import type { SupportedLocale } from "@/lib/locale-path";
export type CaseType =
  Database["public"]["Tables"]["cases"]["Row"]["case_type"];
export type CasePhase = "child" | "financial" | "asset";
export type DisputeType =
  Database["public"]["Tables"]["questions"]["Row"]["dispute_type"];
export type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
export type CaseRow = Database["public"]["Tables"]["cases"]["Row"];
export type AnswerValue = { value: Json };

export interface QuestionWithMeta extends QuestionRow {
  instance_key: string;
  child_id: string | null;
  child_label: string | null;
  sequence: number;
  section_index: number;
  section_question_index: number;
  section_question_total: number;
  phase: CasePhase;
  phase_index: number;
  phase_total: number;
  completed_phases: string[];
  can_invite_early: boolean;
}

export interface QuestionSection {
  name: string;
  dispute_type: DisputeType;
  questions: QuestionWithMeta[];
}

export interface QuestionFlowResult {
  sections: QuestionSection[];
  totalQuestions: number;
  totalSections: number;
  activePhase: CasePhase;
  phaseIndex: number;
  phaseTotal: number;
  completedPhases: string[];
  canInviteEarly: boolean;
}

type QuestionInstance = QuestionRow & {
  instance_key: string;
  child_id: string | null;
  child_label: string | null;
};

const DISPUTE_TYPE_ORDER: Record<DisputeType, number> = {
  child: 0,
  financial: 1,
  asset: 2,
};

export function getDisputeTypesForCase(caseType: CaseType): DisputeType[] {
  if (caseType === "combined") {
    return ["child", "financial", "asset"];
  }

  return [caseType];
}

export function getPhaseForQuestion(question: Pick<QuestionRow, "dispute_type">): CasePhase {
  return question.dispute_type;
}

export function sortQuestions(questions: QuestionRow[]) {
  return [...questions].sort((left, right) => {
    const disputeOrder =
      DISPUTE_TYPE_ORDER[left.dispute_type] -
      DISPUTE_TYPE_ORDER[right.dispute_type];

    if (disputeOrder !== 0) {
      return disputeOrder;
    }

    return left.display_order - right.display_order;
  });
}

function isQuestionAgeEligible(
  question: Pick<QuestionRow, "min_child_age" | "max_child_age">,
  childAge: number,
) {
  if (question.min_child_age !== null && childAge < question.min_child_age) {
    return false;
  }

  if (question.max_child_age !== null && childAge > question.max_child_age) {
    return false;
  }

  return true;
}

function shouldIncludeGenericQuestion(question: QuestionRow, caseChildren: ChildRow[]) {
  if (
    question.min_child_age === null &&
    question.max_child_age === null
  ) {
    return true;
  }

  if (caseChildren.length === 0) {
    return false;
  }

  return caseChildren.some((child) =>
    isQuestionAgeEligible(question, calculateChildAge(child.date_of_birth)),
  );
}

function buildInstancesForQuestion(
  question: QuestionRow,
  caseChildren: ChildRow[],
): QuestionInstance[] {
  if (!question.is_per_child) {
    return shouldIncludeGenericQuestion(question, caseChildren)
      ? [
          {
            ...question,
            instance_key: makeItemKey(question.id),
            child_id: null,
            child_label: null,
          },
        ]
      : [];
  }

  return caseChildren
    .filter((child) =>
      isQuestionAgeEligible(question, calculateChildAge(child.date_of_birth)),
    )
    .map((child, index) => ({
      ...question,
      instance_key: makeItemKey(question.id, child.id),
      child_id: child.id,
      child_label: formatChildLabel(child, index),
    }));
}

export function buildQuestionInstancesByPhase({
  caseItem,
  questions,
  caseChildren,
}: {
  caseItem: Pick<CaseRow, "case_type" | "question_set_version">;
  questions: QuestionRow[];
  caseChildren: ChildRow[];
}) {
  const relevantQuestions = sortQuestions(questions).filter((question) => {
    if (question.question_set_version !== caseItem.question_set_version) {
      return false;
    }

    if (caseItem.case_type === "combined" && question.skip_if_combined) {
      return false;
    }

    return true;
  });

  return getCasePhases(caseItem.case_type).reduce<Record<CasePhase, QuestionInstance[]>>(
    (accumulator, phase) => {
      accumulator[phase] = relevantQuestions
        .filter((question) => getPhaseForQuestion(question) === phase)
        .flatMap((question) => buildInstancesForQuestion(question, caseChildren));

      return accumulator;
    },
    {
      child: [],
      financial: [],
      asset: [],
    },
  );
}

export function buildQuestionFlow({
  caseItem,
  questions,
  caseChildren,
  activePhaseOverride,
}: {
  caseItem: Pick<CaseRow, "case_type" | "question_set_version" | "completed_phases" | "responder_id">;
  questions: QuestionRow[];
  caseChildren: ChildRow[];
  activePhaseOverride?: CasePhase;
}): QuestionFlowResult {
  const phases = getCasePhases(caseItem.case_type);
  const completedPhases = [...new Set(caseItem.completed_phases ?? [])].filter(
    (phase): phase is CasePhase =>
      phase === "child" || phase === "financial" || phase === "asset",
  );
  const activePhase =
    activePhaseOverride ??
    (caseItem.question_set_version === "v2"
      ? phases.find((phase) => !completedPhases.includes(phase)) ?? phases.at(-1) ?? "child"
      : phases[0] ?? "child");
  const instancesByPhase = buildQuestionInstancesByPhase({
    caseItem,
    questions,
    caseChildren,
  });
  const instances =
    caseItem.question_set_version === "v2"
      ? instancesByPhase[activePhase]
      : Object.values(instancesByPhase).flat();

  const groupedSections: QuestionSection[] = [];

  for (const instance of instances) {
    const lastSection = groupedSections.at(-1);

    if (
      lastSection &&
      lastSection.name === instance.section &&
      lastSection.dispute_type === instance.dispute_type
    ) {
      lastSection.questions.push(instance as QuestionWithMeta);
      continue;
    }

    groupedSections.push({
      name: instance.section,
      dispute_type: instance.dispute_type,
      questions: [instance as QuestionWithMeta],
    });
  }

  let sequence = 1;

  for (const [sectionIndex, section] of groupedSections.entries()) {
    const sectionQuestionTotal = section.questions.length;

    section.questions = section.questions.map((question, questionIndex) => ({
      ...question,
      sequence: sequence++,
      section_index: sectionIndex + 1,
      section_question_index: questionIndex + 1,
      section_question_total: sectionQuestionTotal,
      phase: activePhase,
      phase_index: phases.indexOf(activePhase) + 1,
      phase_total: phases.length,
      completed_phases: completedPhases,
      can_invite_early:
        caseItem.question_set_version === "v2" &&
        caseItem.case_type === "combined" &&
        activePhase === "child" &&
        !caseItem.responder_id,
    }));
  }

  return {
    sections: groupedSections,
    totalQuestions: instances.length,
    totalSections: groupedSections.length,
    activePhase,
    phaseIndex: phases.indexOf(activePhase) + 1,
    phaseTotal: phases.length,
    completedPhases,
    canInviteEarly:
      caseItem.question_set_version === "v2" &&
      caseItem.case_type === "combined" &&
      activePhase === "child" &&
      !caseItem.responder_id,
  };
}

export function getLocalizedMessage(
  value: Json | null | undefined,
  locale: string,
): string {
  if (typeof value === "string") {
    return value;
  }

  if (!value || Array.isArray(value) || typeof value !== "object") {
    return "";
  }

  const localizedValue = value[locale];
  const englishValue = value.en;

  if (typeof localizedValue === "string") {
    return localizedValue;
  }

  if (typeof englishValue === "string") {
    return englishValue;
  }

  return "";
}

export function getLocalizedOptions(
  value: Json | null | undefined,
  locale: string,
): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (option): option is string => typeof option === "string",
    );
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const localizedValue = value[locale];
  const englishValue = value.en;

  if (Array.isArray(localizedValue)) {
    return localizedValue.filter(
      (option): option is string => typeof option === "string",
    );
  }

  if (Array.isArray(englishValue)) {
    return englishValue.filter(
      (option): option is string => typeof option === "string",
    );
  }

  return [];
}

export function getQuestionFieldName(question: QuestionWithMeta): string {
  const sectionSlug = question.section
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `q_${question.sequence}_${sectionSlug || "question"}`;
}

export function hasAnswer(answer?: Json | null): boolean {
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
    return false;
  }

  const value = answer.value;

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return value !== null && value !== undefined;
}

export function formatAnswerValue(answer?: Json | null): string {
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
    return "";
  }

  const value = answer.value;

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "number") {
    return value.toString();
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return "";
}
