import "server-only";

import { getCasePhases, makeItemKey } from "@/lib/family-profile";
import {
  buildQuestionInstancesByPhase,
  getDisputeTypesForCase,
  type CasePhase,
} from "@/lib/questions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { getAuthorizedCase } from "@/lib/cases/auth";

type AuthorizedCaseRow = NonNullable<
  Awaited<ReturnType<typeof getAuthorizedCase>>["caseItem"]
>;

export interface FlowQuestionInstance {
  instance_key: string;
}

export interface CaseSubmitFlow {
  phases: readonly CasePhase[];
  instancesByPhase: Record<CasePhase, FlowQuestionInstance[]>;
  responses: Array<{
    id: string;
    user_id: string;
    question_id: string;
    child_id: string | null;
    submitted_at: string | null;
  }>;
  activePhase: CasePhase | null;
  submittedKeysByUser: Map<string, Set<string>>;
}

export async function loadCaseSubmitFlow(
  caseId: string,
  userId: string,
  caseItem: AuthorizedCaseRow,
): Promise<CaseSubmitFlow> {
  const disputeTypes = getDisputeTypesForCase(caseItem.case_type);

  const [
    { data: questions, error: questionsError },
    { data: caseChildren, error: childrenError },
    { data: allResponses, error: responsesError },
  ] = await Promise.all([
    supabaseAdmin
      .from("questions")
      .select("*")
      .eq("question_set_version", caseItem.question_set_version)
      .in("dispute_type", disputeTypes)
      .eq("is_active", true),
    supabaseAdmin
      .from("children")
      .select("*")
      .eq("case_id", caseId)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("responses")
      .select("id, user_id, question_id, child_id, submitted_at")
      .eq("case_id", caseId),
  ]);

  if (questionsError || childrenError || responsesError) {
    throw new Error(
      questionsError?.message ??
        childrenError?.message ??
        responsesError?.message ??
        "Unable to load case flow",
    );
  }

  const phases = getCasePhases(caseItem.case_type);
  const instancesByPhase = buildQuestionInstancesByPhase({
    caseItem,
    questions: questions ?? [],
    caseChildren: caseChildren ?? [],
  });
  const responses = allResponses ?? [];
  const responderPublishedPhases = phases.filter((phase) =>
    caseItem.completed_phases.includes(phase),
  );
  const submittedKeysByUser = new Map<string, Set<string>>();

  for (const response of responses) {
    if (!response.submitted_at) {
      continue;
    }

    const current = submittedKeysByUser.get(response.user_id) ?? new Set<string>();
    current.add(makeItemKey(response.question_id, response.child_id));
    submittedKeysByUser.set(response.user_id, current);
  }

  const isInitiator = caseItem.initiator_id === userId;
  const activePhase = isInitiator
    ? phases.find((phase) => !caseItem.completed_phases.includes(phase)) ??
      phases.at(-1) ??
      "child"
    : responderPublishedPhases.find((phase) =>
        instancesByPhase[phase].some((question) => {
          const submittedKeys = submittedKeysByUser.get(userId) ?? new Set<string>();
          return !submittedKeys.has(question.instance_key);
        }),
      ) ?? null;

  return {
    phases,
    instancesByPhase,
    responses,
    activePhase,
    submittedKeysByUser,
  };
}

export function areAllPhaseInstancesSubmitted(
  instances: FlowQuestionInstance[],
  submittedKeys: Set<string>,
) {
  return instances.every((question) => submittedKeys.has(question.instance_key));
}

export function resolveNextCaseStatus({
  caseItem,
  phases,
  instancesByPhase,
  submittedKeysByUser,
  invitationIntent,
}: {
  caseItem: AuthorizedCaseRow;
  phases: readonly CasePhase[];
  instancesByPhase: Record<CasePhase, FlowQuestionInstance[]>;
  submittedKeysByUser: Map<string, Set<string>>;
  invitationIntent: boolean;
}) {
  if (caseItem.question_set_version !== "v2") {
    const initiatorSubmitted =
      (submittedKeysByUser.get(caseItem.initiator_id) ?? new Set()).size > 0;
    const responderSubmitted = caseItem.responder_id
      ? (submittedKeysByUser.get(caseItem.responder_id) ?? new Set()).size > 0
      : false;

    if (initiatorSubmitted && responderSubmitted) {
      return "comparison" as const;
    }

    if (initiatorSubmitted && caseItem.responder_id) {
      return "active" as const;
    }

    if (initiatorSubmitted || invitationIntent) {
      return "invited" as const;
    }

    return "draft" as const;
  }

  const initiatorSubmittedKeys =
    submittedKeysByUser.get(caseItem.initiator_id) ?? new Set<string>();
  const responderSubmittedKeys = caseItem.responder_id
    ? submittedKeysByUser.get(caseItem.responder_id) ?? new Set<string>()
    : new Set<string>();

  const initiatorPublishedAll = phases.every((phase) =>
    caseItem.completed_phases.includes(phase),
  );
  const responderSubmittedAllPublished = caseItem.responder_id
    ? phases
        .filter((phase) => caseItem.completed_phases.includes(phase))
        .every((phase) =>
          areAllPhaseInstancesSubmitted(instancesByPhase[phase], responderSubmittedKeys),
        )
    : false;
  const initiatorSubmittedAllPublished = phases
    .filter((phase) => caseItem.completed_phases.includes(phase))
    .every((phase) =>
      areAllPhaseInstancesSubmitted(instancesByPhase[phase], initiatorSubmittedKeys),
    );

  if (
    initiatorPublishedAll &&
    caseItem.responder_id &&
    initiatorSubmittedAllPublished &&
    responderSubmittedAllPublished
  ) {
    return "comparison" as const;
  }

  if (caseItem.responder_id) {
    return "active" as const;
  }

  if (invitationIntent) {
    return "invited" as const;
  }

  return "draft" as const;
}
