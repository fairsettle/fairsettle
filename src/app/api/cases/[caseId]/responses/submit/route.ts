import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api-errors'
import { getAuthorizedCase } from '@/lib/cases/auth'
import { getRequestOrigin } from '@/lib/app-url'
import {
  getCasePhases,
  makeItemKey,
} from '@/lib/family-profile'
import {
  sendComparisonReadyEmail,
  sendInitiatorSubmittedEmail,
  sendResponderCompletedEmail,
} from '@/lib/email/resend'
import {
  buildQuestionInstancesByPhase,
  getDisputeTypesForCase,
  type CasePhase,
} from '@/lib/questions'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/timeline'

const submitSchema = z.object({
  action: z.enum(['continue', 'invite', 'pause']).optional(),
})

async function loadCaseFlow(caseId: string, userId: string, caseItem: Awaited<ReturnType<typeof getAuthorizedCase>>['caseItem']) {
  if (!caseItem) {
    throw new Error('Case not found')
  }

  const disputeTypes = getDisputeTypesForCase(caseItem.case_type)

  const [
    { data: questions, error: questionsError },
    { data: caseChildren, error: childrenError },
    { data: allResponses, error: responsesError },
  ] = await Promise.all([
    supabaseAdmin
      .from('questions')
      .select('*')
      .eq('question_set_version', caseItem.question_set_version)
      .in('dispute_type', disputeTypes)
      .eq('is_active', true),
    supabaseAdmin
      .from('children')
      .select('*')
      .eq('case_id', caseId)
      .order('sort_order', { ascending: true }),
    supabaseAdmin
      .from('responses')
      .select('id, user_id, question_id, child_id, submitted_at')
      .eq('case_id', caseId),
  ])

  if (questionsError || childrenError || responsesError) {
    throw new Error(
      questionsError?.message ??
        childrenError?.message ??
        responsesError?.message ??
        'Unable to load case flow',
    )
  }

  const phases = getCasePhases(caseItem.case_type)
  const instancesByPhase = buildQuestionInstancesByPhase({
    caseItem,
    questions: questions ?? [],
    caseChildren: caseChildren ?? [],
  })
  const responses = allResponses ?? []

  const responderPublishedPhases = phases.filter((phase) =>
    caseItem.completed_phases.includes(phase),
  )
  const submittedKeysByUser = new Map<string, Set<string>>()

  for (const response of responses) {
    if (!response.submitted_at) {
      continue
    }

    const current = submittedKeysByUser.get(response.user_id) ?? new Set<string>()
    current.add(makeItemKey(response.question_id, response.child_id))
    submittedKeysByUser.set(response.user_id, current)
  }

  const isInitiator = caseItem.initiator_id === userId
  const activePhase = isInitiator
    ? phases.find((phase) => !caseItem.completed_phases.includes(phase)) ?? phases.at(-1) ?? 'child'
    : responderPublishedPhases.find((phase) =>
        instancesByPhase[phase].some((question) => {
          const submittedKeys = submittedKeysByUser.get(userId) ?? new Set<string>()
          return !submittedKeys.has(question.instance_key)
        }),
      ) ?? null

  return {
    questions: questions ?? [],
    phases,
    instancesByPhase,
    responses,
    activePhase,
    submittedKeysByUser,
  }
}

function areAllPhaseInstancesSubmitted(
  instances: { instance_key: string }[],
  submittedKeys: Set<string>,
) {
  return instances.every((question) => submittedKeys.has(question.instance_key))
}

function resolveNextStatus({
  caseItem,
  phases,
  instancesByPhase,
  submittedKeysByUser,
  invitationIntent,
}: {
  caseItem: NonNullable<Awaited<ReturnType<typeof getAuthorizedCase>>['caseItem']>
  phases: readonly CasePhase[]
  instancesByPhase: Record<CasePhase, { instance_key: string }[]>
  submittedKeysByUser: Map<string, Set<string>>
  invitationIntent: boolean
}) {
  if (caseItem.question_set_version !== 'v2') {
    const initiatorSubmitted = (submittedKeysByUser.get(caseItem.initiator_id) ?? new Set()).size > 0
    const responderSubmitted = caseItem.responder_id
      ? (submittedKeysByUser.get(caseItem.responder_id) ?? new Set()).size > 0
      : false

    if (initiatorSubmitted && responderSubmitted) {
      return 'comparison' as const
    }

    if (initiatorSubmitted && caseItem.responder_id) {
      return 'active' as const
    }

    if (initiatorSubmitted || invitationIntent) {
      return 'invited' as const
    }

    return 'draft' as const
  }

  const initiatorSubmittedKeys = submittedKeysByUser.get(caseItem.initiator_id) ?? new Set<string>()
  const responderSubmittedKeys = caseItem.responder_id
    ? submittedKeysByUser.get(caseItem.responder_id) ?? new Set<string>()
    : new Set<string>()

  const initiatorPublishedAll = phases.every((phase) =>
    caseItem.completed_phases.includes(phase),
  )
  const responderSubmittedAllPublished = caseItem.responder_id
    ? phases
        .filter((phase) => caseItem.completed_phases.includes(phase))
        .every((phase) =>
          areAllPhaseInstancesSubmitted(instancesByPhase[phase], responderSubmittedKeys),
        )
    : false
  const initiatorSubmittedAllPublished = phases
    .filter((phase) => caseItem.completed_phases.includes(phase))
    .every((phase) =>
      areAllPhaseInstancesSubmitted(instancesByPhase[phase], initiatorSubmittedKeys),
    )

  if (
    initiatorPublishedAll &&
    caseItem.responder_id &&
    initiatorSubmittedAllPublished &&
    responderSubmittedAllPublished
  ) {
    return 'comparison' as const
  }

  if (caseItem.responder_id) {
    return 'active' as const
  }

  if (invitationIntent) {
    return 'invited' as const
  }

  return 'draft' as const
}

export async function POST(
  req: Request,
  { params }: { params: { caseId: string } },
) {
  const { supabase, user, caseItem, response } = await getAuthorizedCase(params.caseId, req)

  if (response) {
    return response
  }
  if (!user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }
  if (!caseItem) {
    return apiError(req, 'CASE_NOT_FOUND', 404)
  }

  const parsed = submitSchema.safeParse(await req.json().catch(() => ({})))

  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, {
      details: parsed.error.issues,
    })
  }

  const action = parsed.data.action ?? 'continue'

  try {
    const { phases, instancesByPhase, responses, activePhase, submittedKeysByUser } =
      await loadCaseFlow(params.caseId, user.id, caseItem)

    if (!activePhase) {
      return apiError(req, 'PHASE_NOT_ACTIVE', 409)
    }

    const phaseInstances = instancesByPhase[activePhase]
    const phaseKeys = new Set(phaseInstances.map((question) => question.instance_key))
    const userResponses = responses.filter((item) => item.user_id === user.id)
    const phaseResponseIds = userResponses
      .filter((item) => phaseKeys.has(makeItemKey(item.question_id, item.child_id)))
      .map((item) => item.id)

    if (!phaseResponseIds.length) {
      return apiError(req, 'NO_RESPONSES_FOUND', 400)
    }

    const hasMissingAnswers = phaseInstances.some((question) => {
      const matchingResponse = userResponses.find(
        (responseItem) =>
          makeItemKey(responseItem.question_id, responseItem.child_id) === question.instance_key,
      )

      return !matchingResponse
    })

    if (hasMissingAnswers) {
      return apiError(req, 'PHASE_INCOMPLETE', 400)
    }

    const alreadySubmitted = userResponses
      .filter((item) => phaseKeys.has(makeItemKey(item.question_id, item.child_id)))
      .every((item) => item.submitted_at !== null)

    if (!alreadySubmitted) {
      const submittedAt = new Date().toISOString()
      const { error: submitError } = await supabase
        .from('responses')
        .update({ submitted_at: submittedAt })
        .in('id', phaseResponseIds)

      if (submitError) {
        return apiError(req, 'SAVE_FAILED', 400)
      }

      for (const id of phaseResponseIds) {
        const responseRow = responses.find((item) => item.id === id)

        if (responseRow) {
          const current = submittedKeysByUser.get(user.id) ?? new Set<string>()
          current.add(makeItemKey(responseRow.question_id, responseRow.child_id))
          submittedKeysByUser.set(user.id, current)
        }
      }
    }

    let nextCompletedPhases = [...new Set(caseItem.completed_phases)]
    const isInitiator = caseItem.initiator_id === user.id

    if (isInitiator && !nextCompletedPhases.includes(activePhase)) {
      nextCompletedPhases = [...nextCompletedPhases, activePhase]
    }

    const isFinalPhase = activePhase === phases.at(-1)
    const nextStatus = resolveNextStatus({
      caseItem: {
        ...caseItem,
        completed_phases: nextCompletedPhases,
      },
      phases,
      instancesByPhase,
      submittedKeysByUser,
      invitationIntent:
        isInitiator &&
        (action === 'invite' || isFinalPhase),
    })

    const casePatch: {
      status: typeof caseItem.status
      completed_phases?: string[]
    } = { status: nextStatus }

    if (isInitiator) {
      casePatch.completed_phases = nextCompletedPhases
    }

    const { error: caseUpdateError } = await supabaseAdmin
      .from('cases')
      .update(casePatch)
      .eq('id', params.caseId)

    if (caseUpdateError) {
      return apiError(req, 'CASE_UPDATE_FAILED', 400)
    }

    await logEvent(params.caseId, 'questions_completed', user.id, { phase: activePhase })

    if (isInitiator && !alreadySubmitted) {
      const { data: initiatorProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, preferred_language')
        .eq('id', caseItem.initiator_id)
        .maybeSingle()

      if (initiatorProfile?.email) {
        await sendInitiatorSubmittedEmail(
          initiatorProfile.email,
          params.caseId,
          initiatorProfile.preferred_language || 'en',
          getRequestOrigin(req),
        ).catch(() => null)
      }
    }

    if (caseItem.responder_id === user.id && isFinalPhase) {
      await logEvent(params.caseId, 'responder_completed', user.id)

      const { data: initiatorProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, preferred_language')
        .eq('id', caseItem.initiator_id)
        .maybeSingle()

      if (initiatorProfile?.email) {
        await sendResponderCompletedEmail(
          initiatorProfile.email,
          params.caseId,
          initiatorProfile.preferred_language || 'en',
          getRequestOrigin(req),
        ).catch(() => null)
      }
    }

    if (nextStatus === 'comparison') {
      await logEvent(params.caseId, 'comparison_generated', user.id)

      const participantIds = [caseItem.initiator_id, caseItem.responder_id].filter(
        (value): value is string => Boolean(value),
      )

      const { data: participantProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email, preferred_language')
        .in('id', participantIds)

      for (const profile of participantProfiles ?? []) {
        if (!profile.email) {
          continue
        }

        await sendComparisonReadyEmail(
          profile.email,
          params.caseId,
          profile.preferred_language || 'en',
          getRequestOrigin(req),
        ).catch(() => null)
      }
    }

    return NextResponse.json({
      success: true,
      status: nextStatus,
      active_phase: activePhase,
      completed_phases: nextCompletedPhases,
      phase_complete: true,
      can_invite_early:
        caseItem.question_set_version === 'v2' &&
        caseItem.case_type === 'combined' &&
        activePhase === 'child' &&
        !caseItem.responder_id,
      waiting_for_next_phase:
        !isInitiator &&
        nextStatus === 'active' &&
        phases.some((phase) => !nextCompletedPhases.includes(phase)),
      next_action: nextStatus === 'comparison'
        ? 'comparison'
        : action === 'pause'
          ? 'pause'
          : isFinalPhase
            ? isInitiator
              ? caseItem.responder_id
                ? 'dashboard'
                : 'invite'
              : 'dashboard'
            : action,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to submit responses',
      },
      { status: 400 },
    )
  }
}
