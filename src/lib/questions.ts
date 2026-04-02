import type { Json, Database } from "@/types/database";

export type SupportedLocale = "en" | "pl" | "ro" | "ar";
export type CaseType =
  Database["public"]["Tables"]["cases"]["Row"]["case_type"];
export type DisputeType =
  Database["public"]["Tables"]["questions"]["Row"]["dispute_type"];
export type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
export type AnswerValue = { value: Json };

export interface QuestionWithMeta extends QuestionRow {
  sequence: number;
  section_index: number;
  section_question_index: number;
  section_question_total: number;
}

export interface QuestionSection {
  name: string;
  dispute_type: DisputeType;
  questions: QuestionWithMeta[];
}

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

export function buildQuestionSections(questions: QuestionRow[]): {
  sections: QuestionSection[];
  totalQuestions: number;
  totalSections: number;
} {
  const sortedQuestions = sortQuestions(questions);
  const groupedSections: QuestionSection[] = [];

  for (const question of sortedQuestions) {
    const lastSection = groupedSections.at(-1);

    if (
      lastSection &&
      lastSection.name === question.section &&
      lastSection.dispute_type === question.dispute_type
    ) {
      lastSection.questions.push(question as QuestionWithMeta);
      continue;
    }

    groupedSections.push({
      name: question.section,
      dispute_type: question.dispute_type,
      questions: [question as QuestionWithMeta],
    });
  }

  const totalSections = groupedSections.length;
  let sequence = 1;

  for (const [sectionIndex, section] of groupedSections.entries()) {
    const sectionQuestionTotal = section.questions.length;

    section.questions = section.questions.map((question, questionIndex) => ({
      ...question,
      sequence: sequence++,
      section_index: sectionIndex + 1,
      section_question_index: questionIndex + 1,
      section_question_total: sectionQuestionTotal,
    }));
  }

  return {
    sections: groupedSections,
    totalQuestions: sortedQuestions.length,
    totalSections,
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
