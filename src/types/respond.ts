import type { DisputeType } from "@/types/core";

export type ReviewAction = "agree" | "disagree" | "counter";

export interface ReviewItem {
  question_id: string;
  dispute_type: DisputeType;
  question_label: string;
  answer_summary: string;
}

export interface SavedReview {
  question_id: string;
  action: ReviewAction;
  counter_text?: string;
}
