import { NextResponse } from 'next/server'

import { apiError, getApiErrorPayload } from '@/lib/api-errors'
import { getCasePhases, makeItemKey } from '@/lib/family-profile'
import { getAuthorizedCase } from '@/lib/cases/auth'
import {
  buildQuestionFlow,
  buildQuestionInstancesByPhase,
  getDisputeTypesForCase,
  type CasePhase,
} from '@/lib/questions'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  req: Request,
  { params }: { params: { caseId: string } },
) {
  const { supabase, user, caseItem, response } = await getAuthorizedCase(params.caseId, req)

  if (response) {
    return response
  }
  if (!caseItem) {
    return apiError(req, 'CASE_NOT_FOUND', 404)
  }

  const disputeTypes = getDisputeTypesForCase(caseItem.case_type)
  const [
    { data: questions, error },
    { data: caseChildren, error: childrenError },
    { data: userResponses, error: responsesError },
  ] =
    await Promise.all([
      supabaseAdmin
        .from('questions')
        .select('*')
        .eq('question_set_version', caseItem.question_set_version)
        .in('dispute_type', disputeTypes)
        .eq('is_active', true),
      supabaseAdmin
        .from('children')
        .select('*')
        .eq('case_id', params.caseId)
        .order('sort_order', { ascending: true }),
      supabaseAdmin
        .from('responses')
        .select('question_id, child_id, submitted_at')
        .eq('case_id', params.caseId)
        .eq('user_id', user.id),
    ])

  if (error || childrenError || responsesError) {
    return apiError(req, 'QUESTION_FLOW_LOAD_FAILED', 400)
  }

  let activePhaseOverride: CasePhase | undefined

  if (caseItem.question_set_version === 'v2' && caseItem.case_type === 'combined') {
    const phases = getCasePhases(caseItem.case_type)
    const instancesByPhase = buildQuestionInstancesByPhase({
      caseItem,
      questions: questions ?? [],
      caseChildren: caseChildren ?? [],
    })
    const submittedKeys = new Set(
      (userResponses ?? [])
        .filter((response) => response.submitted_at)
        .map((response) => makeItemKey(response.question_id, response.child_id)),
    )

    if (caseItem.initiator_id === user.id) {
      const publishedAllPhases = phases.every((phase) =>
        caseItem.completed_phases.includes(phase),
      )

      if (publishedAllPhases) {
        if (caseItem.status === 'comparison' || caseItem.status === 'completed') {
          return NextResponse.json(
            {
              error: await getApiErrorPayload(req, 'COMPARISON_NOT_READY', 409),
              redirect_to: `/cases/${params.caseId}/comparison`,
            },
            { status: 409 },
          )
        }

        return NextResponse.json(
          {
            error: await getApiErrorPayload(req, 'COMPARISON_NOT_READY', 409),
            waiting_for_phase: true,
          },
          { status: 409 },
        )
      }

      activePhaseOverride =
        phases.find((phase) => !caseItem.completed_phases.includes(phase)) ??
        phases.at(-1)
    } else {
      const publishedPhases = phases.filter((phase) =>
        caseItem.completed_phases.includes(phase),
      )

      if (publishedPhases.length === 0) {
        return NextResponse.json(
          {
            error: await getApiErrorPayload(req, 'QUESTION_FLOW_LOAD_FAILED', 409),
            waiting_for_phase: true,
          },
          { status: 409 },
        )
      }

      activePhaseOverride = publishedPhases.find((phase) =>
        instancesByPhase[phase].some(
          (question) => !submittedKeys.has(question.instance_key),
        ),
      )

      if (!activePhaseOverride) {
        if (publishedPhases.length < phases.length) {
          return NextResponse.json(
            {
              error: await getApiErrorPayload(req, 'QUESTION_FLOW_LOAD_FAILED', 409),
              waiting_for_phase: true,
            },
            { status: 409 },
          )
        }

        return NextResponse.json(
          {
            error: await getApiErrorPayload(req, 'COMPARISON_NOT_READY', 409),
            redirect_to: `/cases/${params.caseId}/comparison`,
          },
          { status: 409 },
        )
      }
    }
  }

  const {
    sections,
    totalQuestions,
    totalSections,
    activePhase,
    phaseIndex,
    phaseTotal,
    completedPhases,
    canInviteEarly,
  } = buildQuestionFlow({
    caseItem,
    questions: questions ?? [],
    caseChildren: caseChildren ?? [],
    activePhaseOverride,
  })

  return NextResponse.json({
    sections,
    total_questions: totalQuestions,
    total_sections: totalSections,
    active_phase: activePhase,
    phase_index: phaseIndex,
    phase_total: phaseTotal,
    completed_phases: completedPhases,
    can_invite_early: canInviteEarly,
    question_set_version: caseItem.question_set_version,
    viewer_role: caseItem.initiator_id === user?.id ? 'initiator' : 'responder',
    has_responder: Boolean(caseItem.responder_id),
  })
}
