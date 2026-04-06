import type { InviteItem } from "@/types/invitations";

export function getInviteDeliveryStatusClasses(
  status: InviteItem["delivery_status"],
) {
  switch (status) {
    case "delivered":
      return "border-success/10 bg-success-soft text-success";
    case "delivery_delayed":
      return "border-warning/10 bg-warning-soft text-warning";
    case "bounced":
    case "complained":
    case "failed":
      return "border-danger/10 bg-danger-soft text-danger";
    case "queued":
    default:
      return "border-brand/10 bg-brand-soft text-brand-strong";
  }
}

export function getInviteStatusClasses(status: InviteItem["status"]) {
  switch (status) {
    case "accepted":
      return "border-success/10 bg-success-soft text-success";
    case "opened":
      return "border-brand/10 bg-brand-soft text-brand-strong";
    case "expired":
      return "border-danger/10 bg-danger-soft text-danger";
    case "sent":
    default:
      return "border-warning/10 bg-warning-soft text-warning";
  }
}
