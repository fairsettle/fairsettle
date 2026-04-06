import type { ReviewAction, ReviewItem } from "@/types/respond";

export function getResponderReviewBadgeClassName(
  disputeType: ReviewItem["dispute_type"],
) {
  if (disputeType === "child") {
    return "border-brand/10 bg-brand-soft text-brand-strong";
  }

  if (disputeType === "financial") {
    return "border-warning/10 bg-warning-soft text-warning-foreground";
  }

  return "border-line bg-surface-soft text-ink";
}

export function getResponderReviewActionClassName(
  action: ReviewAction,
  isSelected: boolean,
) {
  if (!isSelected) {
    return "border-line bg-surface text-ink-soft hover:border-brand/15 hover:text-ink";
  }

  if (action === "agree") {
    return "border-success/20 bg-success-soft text-success-foreground";
  }

  if (action === "disagree") {
    return "border-danger/20 bg-danger-soft text-danger";
  }

  return "border-warning/20 bg-warning-soft text-warning-foreground";
}
