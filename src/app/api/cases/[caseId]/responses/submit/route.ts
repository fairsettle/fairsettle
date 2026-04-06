import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api-errors'
import { getAuthorizedCase } from '@/lib/cases/auth'
import {
  loadCaseSubmitFlow,
  resolveNextCaseStatus,
} from '@/lib/cases/submit-flow'
import { getRequestOrigin } from '@/lib/app-url'
import {
  makeItemKey,
} from '@/lib/family-profile'
import {
  sendComparisonReadyEmail,
  sendInitiatorSubmittedEmail,
  sendResponderCompletedEmail,
} from '@/lib/email/resend'
import {
  type CasePhase,
} from '@/lib/questions'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/timeline'

const submitSchema = z.object({
  action: z.enum(['continue', 'invite', 'pause']).optional(),
})

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
      await loadCaseSubmitFlow(params.caseId, user.id, caseItem)

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
    const nextStatus = resolveNextCaseStatus({
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
    return apiError(req, 'SAVE_FAILED', 400)
  }
}
