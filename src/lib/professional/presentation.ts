import type { Json } from "@/types/database";
import type { ReferralStatus } from "@/types/referrals";

export function formatReferralStatus(status: ReferralStatus | string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatPaymentModel(paymentModel: string | null | undefined) {
  if (!paymentModel) {
    return "No payment model";
  }

  const map: Record<string, string> = {
    request_only: "Request only",
    mediator_assist: "Mediator Assist",
    connect_checkout: "Marketplace payment",
    solicitor_off_platform: "Solicitor off-platform",
  };

  return map[paymentModel] ?? paymentModel;
}

export function formatMeetingMode(mode: string | null | undefined) {
  if (!mode) return "Not set";
  return mode === "in_person" ? "In person" : mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function formatReviewBucket(bucket: string | null | undefined) {
  if (!bucket) return "Needs review";

  const map: Record<string, string> = {
    agreed: "Agreed",
    disputed: "Disputed",
    unresolved: "Unresolved",
    locked: "Locked",
    review: "Needs review",
  };

  return map[bucket] ?? bucket
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizePrimitive(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("en-GB") : String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function formatLocalizedText(value: unknown, preferredLocale = "en"): string {
  if (!isRecord(value)) {
    return normalizePrimitive(value);
  }

  const direct = value[preferredLocale];
  if (typeof direct === "string" && direct.trim()) {
    return direct;
  }

  const english = value.en;
  if (typeof english === "string" && english.trim()) {
    return english;
  }

  const firstString = Object.values(value).find((entry) => typeof entry === "string" && entry.trim());
  if (typeof firstString === "string") {
    return firstString;
  }

  return normalizePrimitive(value);
}

export function formatAnswerValue(value: Json | null | undefined, preferredLocale = "en"): string {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  if (Array.isArray(value)) {
    const parts = value.map((entry) => formatAnswerValue(entry as Json, preferredLocale)).filter(Boolean);
    return parts.length ? parts.join(", ") : "Not provided";
  }

  if (!isRecord(value)) {
    return normalizePrimitive(value);
  }

  if (typeof value.value === "string" || typeof value.value === "number" || typeof value.value === "boolean") {
    return normalizePrimitive(value.value);
  }

  if (Array.isArray(value.value)) {
    return value.value.map((entry) => formatAnswerValue(entry as Json, preferredLocale)).join(", ");
  }

  const label = value.label ?? value.text ?? value.title;
  if (typeof label === "string" && label.trim()) {
    return label;
  }

  const localized = formatLocalizedText(value, preferredLocale);
  if (localized !== "[object Object]") {
    return localized;
  }

  const flattened = Object.entries(value)
    .map(([key, entry]) => `${key}: ${formatAnswerValue(entry as Json, preferredLocale)}`)
    .join(" • ");

  return flattened || "Not provided";
}

export function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(Number(amount ?? 0));
}

export function buildReferralRequestSummary(
  request:
    | {
        specialist_type?: string | null;
        location_preference?: string | null;
        location_text?: string | null;
        preferred_time_window?: string | null;
        source?: string | null;
      }
    | Array<{
        specialist_type?: string | null;
        location_preference?: string | null;
        location_text?: string | null;
        preferred_time_window?: string | null;
        source?: string | null;
      }>
    | null
    | undefined,
) {
  const item = Array.isArray(request) ? request[0] : request;

  if (!item) {
    return "Manual referral assignment";
  }

  const parts = [
    item.specialist_type
      ? `${item.specialist_type.charAt(0).toUpperCase()}${item.specialist_type.slice(1)} request`
      : null,
    item.location_preference ? `Preference: ${item.location_preference}` : null,
    item.location_text || null,
    item.preferred_time_window || null,
    item.source ? `Source: ${item.source.replaceAll("_", " ")}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" • ") : "Manual referral assignment";
}

export function formatDateTime(value: string | null | undefined, locale = "en-GB") {
  if (!value) return "Not scheduled";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function severityTone(severity: string | null | undefined) {
  switch (severity) {
    case "critical":
      return "bg-red-50 text-red-700 border-red-200";
    case "high":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "medium":
      return "bg-brand-soft text-brand-strong border-brand/15";
    case "low":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-surface-soft text-ink-soft border-line/70";
  }
}
