import { cn } from "@/lib/utils";
import { formatReferralStatus } from "@/lib/professional/presentation";

export function ReferralStatusBadge({ status }: { status: string }) {
  const tone =
    status === "completed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "recommendation_submitted"
        ? "bg-brand-soft text-brand-strong border-brand/15"
        : status === "session_scheduled"
          ? "bg-sky-50 text-sky-700 border-sky-200"
          : status === "accepted"
            ? "bg-violet-50 text-violet-700 border-violet-200"
            : status === "cancelled"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-surface-soft text-ink-soft border-line/70";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.14em]", tone)}>
      {formatReferralStatus(status)}
    </span>
  );
}
