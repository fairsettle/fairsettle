import "server-only";

import { answersMatch } from "@/lib/comparison";
import type { getAuthorizedCase } from "@/lib/cases/auth";
import type { Json } from "@/types/database";
import type { AnswerValue as EngineAnswerValue } from "@/lib/resolution/engine";
import type { Database } from "@/types/database";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AuthorizedCaseRow = NonNullable<
  Awaited<ReturnType<typeof getAuthorizedCase>>["caseItem"]
>;

type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
type StateRow = Database["public"]["Tables"]["case_item_states"]["Row"];

export function coerceModifiedValue(
  question: QuestionRow,
  rawValue: unknown,
): EngineAnswerValue {
  if (question.question_type === "multi_choice") {
    const values = Array.isArray(rawValue)
      ? rawValue.filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
      : typeof rawValue === "string"
        ? rawValue
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : [];

    if (values.length === 0) {
      throw new Error("Please choose at least one option");
    }

    return { values };
  }

  if (question.question_type === "number") {
    const parsed = typeof rawValue === "number" ? rawValue : Number(rawValue);

    if (!Number.isFinite(parsed)) {
      throw new Error("Please enter a valid number");
    }

    return { value: parsed };
  }

  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    throw new Error("Please provide a value");
  }

  return { value: rawValue.trim() };
}

export async function getCurrentResolutionProposal({
  caseId,
  itemKey,
  fallback,
}: {
  caseId: string;
  itemKey: string;
  fallback: EngineAnswerValue | null;
}) {
  const { data: latestEvent, error } = await supabaseAdmin
    .from("case_item_events")
    .select("proposed_value")
    .eq("case_id", caseId)
    .eq("item_key", itemKey)
    .in("action", ["accept", "modify"])
    .not("proposed_value", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (
    latestEvent?.proposed_value &&
    typeof latestEvent.proposed_value === "object" &&
    !Array.isArray(latestEvent.proposed_value)
  ) {
    return latestEvent.proposed_value as EngineAnswerValue;
  }

  return fallback;
}

export function getResolutionActorFieldPrefix(
  caseItem: AuthorizedCaseRow,
  userId: string,
) {
  return caseItem.initiator_id === userId ? "initiator" : "responder";
}

export function buildResolutionNextState({
  actorPrefix,
  action,
  engineStatus,
  proposedValue,
  state,
}: {
  actorPrefix: "initiator" | "responder";
  action: "accept" | "modify" | "reject";
  engineStatus: "agreed" | "different" | "gap" | "no_comparison";
  proposedValue: Json | null;
  state: StateRow;
}) {
  const otherPrefix = actorPrefix === "initiator" ? "responder" : "initiator";
  const actorStatusKey = `${actorPrefix}_status` as const;
  const actorValueKey = `${actorPrefix}_value` as const;
  const otherStatusKey = `${otherPrefix}_status` as const;

  const nextState: Database["public"]["Tables"]["case_item_states"]["Update"] = {
    [actorStatusKey]:
      action === "accept"
        ? "accepted"
        : action === "modify"
          ? "modified"
          : "rejected",
    [actorValueKey]: action === "reject" ? null : proposedValue,
    locked_at: null,
    unresolved_at: null,
  };

  if (action === "modify") {
    nextState.round_count = Math.min((state.round_count ?? 0) + 1, 3);
  }

  const otherStatus = state[otherStatusKey];
  const actorStatus = nextState[actorStatusKey] as StateRow["initiator_status"];
  const actorValue = nextState[actorValueKey] as Json | null;
  const otherValue =
    actorPrefix === "initiator" ? state.responder_value : state.initiator_value;

  if (
    actorStatus === "accepted" &&
    otherStatus === "accepted" &&
    actorValue &&
    otherValue &&
    answersMatch(actorValue, otherValue)
  ) {
    nextState.review_bucket = "locked";
    nextState.locked_at = new Date().toISOString();
  } else if ((nextState.round_count ?? state.round_count ?? 0) >= 3) {
    nextState.review_bucket = "unresolved";
    nextState.unresolved_at = new Date().toISOString();
  } else if (
    (nextState.initiator_status ?? state.initiator_status) === "pending" &&
    (nextState.responder_status ?? state.responder_status) === "pending" &&
    engineStatus !== "agreed"
  ) {
    nextState.review_bucket = "to_review";
  } else if (engineStatus === "agreed") {
    nextState.review_bucket = "agreed";
  } else {
    nextState.review_bucket = "disputed";
  }

  return nextState;
}
