import type { CasePhase } from "@/types/core";

export function getQuestionDisputeBadgeClassName(phase: CasePhase) {
  if (phase === "child") {
    return "border-brand/15 bg-brand-soft text-brand-strong";
  }

  if (phase === "financial") {
    return "border-warning/15 bg-warning-soft text-warning-foreground";
  }

  return "border-line bg-surface-soft text-ink";
}
