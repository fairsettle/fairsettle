import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api-errors'
import { getRequestOrigin } from '@/lib/app-url'
import { getAuthorizedCase } from '@/lib/cases/auth'
import { sendResolutionModifiedEmail } from '@/lib/email/resend'
import { makeItemKey } from '@/lib/family-profile'
import { resolveItem, type AnswerValue as EngineAnswerValue } from '@/lib/resolution/engine'
import {
  buildResolutionNextState,
  coerceModifiedValue,
  getCurrentResolutionProposal,
  getResolutionActorFieldPrefix,
} from '@/lib/resolution/decision'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/timeline'
import type { Database, Json } from '@/types/database'

const resolutionDecisionSchema = z
  .object({
    action: z.enum(['accept', 'modify', 'reject']),
    child_id: z.string().uuid().nullable().optional(),
    modified_value: z.unknown().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === 'modify' && (value.modified_value === undefined || value.modified_value === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['modified_value'],
        message: 'modified_value is required when action is modify',
      })
    }
  })

export async function PATCH(
  req: Request,
  { params }: { params: { caseId: string; questionId: string } },
) {
  const { user, caseItem, response } = await getAuthorizedCase(params.caseId, req)

  if (response) {
    return response
  }
  if (!user || !caseItem) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  if (!caseItem.responder_id) {
    return apiError(req, 'RESOLUTION_NOT_READY', 409)
  }

  const parsed = resolutionDecisionSchema.safeParse(await req.json())

  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, {
      details: parsed.error.issues,
    })
  }

  const itemKey = makeItemKey(params.questionId, parsed.data.child_id ?? null)

  const [{ data: question, error: questionError }, { data: state, error: stateError }] =
    await Promise.all([
      supabaseAdmin
        .from('questions')
        .select('*')
        .eq('id', params.questionId)
        .eq('question_set_version', caseItem.question_set_version)
        .maybeSingle(),
      supabaseAdmin
        .from('case_item_states')
        .select('*')
        .eq('case_id', params.caseId)
        .eq('item_key', itemKey)
        .maybeSingle(),
    ])

  if (questionError) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  if (stateError) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  if (!question || !state) {
    return apiError(req, 'RESOLUTION_ITEM_NOT_FOUND', 404)
  }

  const initiatorResponseQuery = supabaseAdmin
    .from('responses')
    .select('answer_value')
    .eq('case_id', params.caseId)
    .eq('user_id', caseItem.initiator_id)
    .eq('question_id', params.questionId)
    .not('submitted_at', 'is', null)

  const responderResponseQuery = supabaseAdmin
    .from('responses')
    .select('answer_value')
    .eq('case_id', params.caseId)
    .eq('user_id', caseItem.responder_id)
    .eq('question_id', params.questionId)
    .not('submitted_at', 'is', null)

  if (parsed.data.child_id) {
    initiatorResponseQuery.eq('child_id', parsed.data.child_id)
    responderResponseQuery.eq('child_id', parsed.data.child_id)
  } else {
    initiatorResponseQuery.is('child_id', null)
    responderResponseQuery.is('child_id', null)
  }

  const [{ data: initiatorResponse }, { data: responderResponse }] = await Promise.all([
    initiatorResponseQuery.maybeSingle(),
    responderResponseQuery.maybeSingle(),
  ])

  if (!initiatorResponse || !responderResponse) {
    return apiError(req, 'RESOLUTION_ITEM_NOT_READY', 409)
  }

  const engineResult = resolveItem({
    question_id: question.id,
    question_type: question.question_type,
    question_text: question.question_text as Record<string, string>,
    section: question.section,
    dispute_type: question.dispute_type,
    party_a_answer: initiatorResponse.answer_value as EngineAnswerValue,
    party_b_answer: responderResponse.answer_value as EngineAnswerValue,
    guidance_text: question.guidance_text as Record<string, string> | null,
  })

  const actorPrefix = getResolutionActorFieldPrefix(caseItem, user.id)
  const otherPrefix = actorPrefix === 'initiator' ? 'responder' : 'initiator'

  let proposedValue: Json | null = null

  if (parsed.data.action === 'accept') {
    proposedValue = (await getCurrentResolutionProposal({
      caseId: params.caseId,
      itemKey,
      fallback: engineResult.suggestion,
    })) as Json | null

    if (!proposedValue) {
      return apiError(req, 'RESOLUTION_ITEM_NOT_READY', 409)
    }
  } else if (parsed.data.action === 'modify') {
    try {
      proposedValue = coerceModifiedValue(question, parsed.data.modified_value) as Json
    } catch (error) {
      return apiError(req, 'VALIDATION_FAILED', 400)
    }
  }

  const nextState = buildResolutionNextState({
    actorPrefix,
    action: parsed.data.action,
    engineStatus: engineResult.status,
    proposedValue,
    state,
  })

  const { data: updatedState, error: updateError } = await supabaseAdmin
    .from('case_item_states')
    .update(nextState)
    .eq('id', state.id)
    .select('*')
    .single()

  if (updateError || !updatedState) {
    return apiError(req, 'SAVE_FAILED', 400)
  }

  const eventInserts: Database['public']['Tables']['case_item_events']['Insert'][] = [
    {
      case_id: params.caseId,
      item_key: itemKey,
      question_id: params.questionId,
      child_id: parsed.data.child_id ?? null,
      actor_user_id: user.id,
      action: parsed.data.action,
      proposed_value: proposedValue,
    },
  ]

  if (updatedState.locked_at) {
    eventInserts.push({
      case_id: params.caseId,
      item_key: itemKey,
      question_id: params.questionId,
      child_id: parsed.data.child_id ?? null,
      actor_user_id: null,
      action: 'lock',
      proposed_value: proposedValue,
    })
  } else if (updatedState.unresolved_at) {
    eventInserts.push({
      case_id: params.caseId,
      item_key: itemKey,
      question_id: params.questionId,
      child_id: parsed.data.child_id ?? null,
      actor_user_id: null,
      action: 'unresolved',
      proposed_value: proposedValue,
    })
  }

  const { error: eventError } = await supabaseAdmin
    .from('case_item_events')
    .insert(eventInserts)

  if (eventError) {
    return apiError(req, 'SAVE_FAILED', 400)
  }

  const timelineEventType =
    parsed.data.action === 'accept'
      ? 'resolution_accepted'
      : parsed.data.action === 'modify'
        ? 'resolution_modified'
        : 'resolution_rejected'

  await logEvent(params.caseId, timelineEventType, user.id, {
    question_id: params.questionId,
    child_id: parsed.data.child_id ?? null,
    item_key: itemKey,
    modified_value: parsed.data.action === 'modify' ? proposedValue : null,
  })

  if (parsed.data.action === 'modify') {
    const recipientId = actorPrefix === 'initiator' ? caseItem.responder_id : caseItem.initiator_id

    if (recipientId) {
      const [{ data: actorProfile }, { data: recipientProfile }] = await Promise.all([
        supabaseAdmin
          .from('profiles')
          .select('parent_role')
          .eq('id', user.id)
          .maybeSingle(),
        supabaseAdmin
          .from('profiles')
          .select('email, preferred_language')
          .eq('id', recipientId)
          .maybeSingle(),
      ])

      if (recipientProfile?.email) {
        await sendResolutionModifiedEmail(
          recipientProfile.email,
          params.caseId,
          actorProfile?.parent_role ?? null,
          recipientProfile.preferred_language || 'en',
          getRequestOrigin(req),
        ).catch(() => null)
      }
    }
  }

  return NextResponse.json({
    success: true,
    state: updatedState,
  })
}
