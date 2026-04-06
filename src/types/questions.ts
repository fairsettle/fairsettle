import type { AnswerValue, QuestionSection } from "@/lib/questions";
import type {
  CasePhase,
  QuestionSetVersion,
  ViewerRole,
} from "@/types/core";

export interface QuestionsPayload {
  sections: QuestionSection[];
  total_questions: number;
  total_sections: number;
  active_phase: CasePhase;
  phase_index: number;
  phase_total: number;
  completed_phases: string[];
  can_invite_early: boolean;
  question_set_version: QuestionSetVersion;
  viewer_role: ViewerRole;
  has_responder: boolean;
}

export interface SavedResponse {
  question_id: string;
  child_id: string | null;
  answer_value: AnswerValue;
}

export interface QuestionReviewSummaryItem {
  label: string;
  value: string;
}
