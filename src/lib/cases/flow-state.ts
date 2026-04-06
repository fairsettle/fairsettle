import { getCasePhases, makeItemKey } from "@/lib/family-profile";
import { buildQuestionInstancesByPhase } from "@/lib/questions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

export type CaseFlowState =
  | "default"
  | "continue_next_phase"
  | "waiting_for_responder"
  | "continue_response"
  | "waiting_for_next_phase";

type CaseRow = Database["public"]["Tables"]["cases"]["Row"];

export async function getCaseFlowState(
  caseItem: Pick<
    CaseRow,
    | "id"
    | "case_type"
    | "status"
    | "question_set_version"
    | "completed_phases"
    | "initiator_id"
    | "responder_id"
  >,
  viewerId: string,
): Promise<CaseFlowState> {
  if (
    caseItem.status !== "active" ||
    caseItem.question_set_version !== "v2" ||
    caseItem.case_type !== "combined"
  ) {
    return "default";
  }

  const phases = getCasePhases(caseItem.case_type);
  const completedPhases = caseItem.completed_phases ?? [];

  if (caseItem.initiator_id === viewerId) {
    return completedPhases.length < phases.length
      ? "continue_next_phase"
      : "waiting_for_responder";
  }

  const publishedPhases = phases.filter((phase) =>
    completedPhases.includes(phase),
  );

  if (publishedPhases.length === 0) {
    return "waiting_for_next_phase";
  }

  const [
    { data: questions, error: questionsError },
    { data: caseChildren, error: childrenError },
    { data: userResponses, error: responsesError },
  ] = await Promise.all([
    supabaseAdmin
      .from("questions")
      .select("*")
      .eq("question_set_version", caseItem.question_set_version)
      .in("dispute_type", ["child", "financial", "asset"])
      .eq("is_active", true),
    supabaseAdmin
      .from("children")
      .select("*")
      .eq("case_id", caseItem.id)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("responses")
      .select("question_id, child_id, submitted_at")
      .eq("case_id", caseItem.id)
      .eq("user_id", viewerId),
  ]);

  if (questionsError || childrenError || responsesError) {
    return "default";
  }

  const instancesByPhase = buildQuestionInstancesByPhase({
    caseItem,
    questions: questions ?? [],
    caseChildren: caseChildren ?? [],
  });
  const submittedKeys = new Set(
    (userResponses ?? [])
      .filter((response) => response.submitted_at)
      .map((response) => makeItemKey(response.question_id, response.child_id)),
  );

  const hasPendingPublishedPhase = publishedPhases.some((phase) =>
    instancesByPhase[phase].some(
      (question) => !submittedKeys.has(question.instance_key),
    ),
  );

  if (hasPendingPublishedPhase) {
    return "continue_response";
  }

  return publishedPhases.length < phases.length
    ? "waiting_for_next_phase"
    : "waiting_for_responder";
}
