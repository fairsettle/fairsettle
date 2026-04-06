import type { Database, Json } from '@/types/database'

import { formatChildLabel, makeItemKey } from '@/lib/family-profile'
import { getDisputeTypesForCase } from '@/lib/questions'
import { supabaseAdmin } from '@/lib/supabase/admin'

type CaseType = Database['public']['Tables']['cases']['Row']['case_type']
type DisputeType = Database['public']['Tables']['questions']['Row']['dispute_type']
type QuestionRow = Database['public']['Tables']['questions']['Row']
type ResponseRow = Database['public']['Tables']['responses']['Row']
export type ViewerRole = 'initiator' | 'responder'

export interface ComparisonSummary {
  agreed_count: number
  gap_count: number
  disputed_count: number
  to_review_count: number
  locked_count: number
  unresolved_count: number
  total_compared: number
  reviewed_count: number
}

export interface SafeComparisonItem {
  item_key: string
  question_id: string
  child_id: string | null
  child_label: string | null
  question_text: QuestionRow['question_text']
  question_type: QuestionRow['question_type']
  options: QuestionRow['options']
  section: string
  dispute_type: DisputeType
  status: 'agreed' | 'gap'
  review_bucket: 'to_review' | 'agreed' | 'disputed' | 'locked' | 'unresolved'
  round_count: number
  is_locked: boolean
  is_unresolved: boolean
  initiator_status: Database['public']['Tables']['case_item_states']['Row']['initiator_status']
  responder_status: Database['public']['Tables']['case_item_states']['Row']['responder_status']
  initiator_value: Database['public']['Tables']['case_item_states']['Row']['initiator_value']
  responder_value: Database['public']['Tables']['case_item_states']['Row']['responder_value']
  current_value: Json | null
  party_a_answer: ResponseRow['answer_value']
  party_b_answer: ResponseRow['answer_value']
  guidance_text: QuestionRow['guidance_text']
}

export interface SafeComparisonPayload {
  viewer_role: ViewerRole
  summary: ComparisonSummary
  items: SafeComparisonItem[]
}

function normalizePrimitive(value: unknown) {
  if (typeof value === 'string') {
    return value.trim().toLowerCase()
  }

  return value
}

function sortUnknownArray(values: unknown[]) {
  return [...values]
    .map((value) => {
      if (typeof value === 'string') {
        return value.trim().toLowerCase()
      }

      return JSON.stringify(value)
    })
    .sort()
}

export function answersMatch(answerA: Json, answerB: Json) {
  if (
    !answerA ||
    typeof answerA !== 'object' ||
    Array.isArray(answerA) ||
    !answerB ||
    typeof answerB !== 'object' ||
    Array.isArray(answerB)
  ) {
    return JSON.stringify(answerA) === JSON.stringify(answerB)
  }

  const valueA = 'value' in answerA ? answerA.value : undefined
  const valueB = 'value' in answerB ? answerB.value : undefined
  const valuesA = 'values' in answerA ? answerA.values : undefined
  const valuesB = 'values' in answerB ? answerB.values : undefined

  if (Array.isArray(valuesA) && Array.isArray(valuesB)) {
    return JSON.stringify(sortUnknownArray(valuesA)) === JSON.stringify(sortUnknownArray(valuesB))
  }

  if (valueA !== undefined && valueB !== undefined) {
    if (Array.isArray(valueA) && Array.isArray(valueB)) {
      return JSON.stringify(sortUnknownArray(valueA)) === JSON.stringify(sortUnknownArray(valueB))
    }

    return normalizePrimitive(valueA) === normalizePrimitive(valueB)
  }

  return JSON.stringify(answerA) === JSON.stringify(answerB)
}

export async function buildSafeComparisonPayload({
  caseType,
  caseId,
  initiatorId,
  responderId,
  viewerRole,
  questionSetVersion,
}: {
  caseType: CaseType
  caseId: string
  initiatorId: string
  responderId: string
  viewerRole: ViewerRole
  questionSetVersion: 'v1' | 'v2'
}): Promise<SafeComparisonPayload> {
  const disputeTypes = getDisputeTypesForCase(caseType)

  const [
    initiatorResponsesResult,
    responderResponsesResult,
    questionsResult,
    statesResult,
    childrenResult,
    eventsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from('responses')
      .select('question_id, child_id, answer_value, submitted_at')
      .eq('case_id', caseId)
      .eq('user_id', initiatorId)
      .not('submitted_at', 'is', null),
    supabaseAdmin
      .from('responses')
      .select('question_id, child_id, answer_value, submitted_at')
      .eq('case_id', caseId)
      .eq('user_id', responderId)
      .not('submitted_at', 'is', null),
    supabaseAdmin
      .from('questions')
      .select('id, question_text, question_type, options, section, dispute_type, guidance_text, display_order')
      .eq('question_set_version', questionSetVersion)
      .in('dispute_type', disputeTypes)
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabaseAdmin
      .from('case_item_states')
      .select('*')
      .eq('case_id', caseId),
    supabaseAdmin
      .from('children')
      .select('id, first_name, sort_order')
      .eq('case_id', caseId),
    supabaseAdmin
      .from('case_item_events')
      .select('item_key, action, proposed_value, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false }),
  ])

  const initiatorResponses = initiatorResponsesResult.data ?? []
  const responderResponses = responderResponsesResult.data ?? []
  const questions = questionsResult.data ?? []
  const childMap = new Map(
    (childrenResult.data ?? []).map((child) => [
      child.id,
      formatChildLabel({ first_name: child.first_name }, child.sort_order),
    ]),
  )

  if (initiatorResponsesResult.error) {
    throw new Error(initiatorResponsesResult.error.message)
  }

  if (responderResponsesResult.error) {
    throw new Error(responderResponsesResult.error.message)
  }

  if (questionsResult.error) {
    throw new Error(questionsResult.error.message)
  }

  if (statesResult.error) {
    throw new Error(statesResult.error.message)
  }

  if (eventsResult.error) {
    throw new Error(eventsResult.error.message)
  }

  const initiatorResponseMap = new Map(
    initiatorResponses.map((response) => [
      makeItemKey(response.question_id, response.child_id),
      response,
    ]),
  )
  const responderResponseMap = new Map(
    responderResponses.map((response) => [
      makeItemKey(response.question_id, response.child_id),
      response,
    ]),
  )
  const stateMap = new Map(
    (statesResult.data ?? []).map((state) => [state.item_key, state]),
  )
  const eventValueMap = new Map<string, Json | null>()

  for (const event of eventsResult.data ?? []) {
    if (eventValueMap.has(event.item_key)) {
      continue
    }

    if ((event.action === 'accept' || event.action === 'modify') && event.proposed_value) {
      eventValueMap.set(event.item_key, event.proposed_value)
    }
  }

  const sharedKeys = [...initiatorResponseMap.keys()].filter((key) =>
    responderResponseMap.has(key),
  )

  const missingStates = sharedKeys
    .filter((itemKey) => !stateMap.has(itemKey))
    .map((itemKey) => {
      const initiatorResponse = initiatorResponseMap.get(itemKey)!
      const responderResponse = responderResponseMap.get(itemKey)!
      const status = answersMatch(
        initiatorResponse.answer_value,
        responderResponse.answer_value,
      )
        ? 'agreed'
        : 'gap'

      return {
        case_id: caseId,
        item_key: itemKey,
        question_id: initiatorResponse.question_id,
        child_id: initiatorResponse.child_id,
        review_bucket: (status === 'agreed' ? 'agreed' : 'to_review') as
          | 'agreed'
          | 'to_review',
        round_count: 0,
      }
    })

  if (missingStates.length > 0) {
    const { data: insertedStates, error: insertStatesError } = await supabaseAdmin
      .from('case_item_states')
      .upsert(missingStates, { onConflict: 'case_id,item_key' })
      .select('*')

    if (insertStatesError) {
      throw new Error(insertStatesError.message)
    }

    for (const state of insertedStates ?? []) {
      stateMap.set(state.item_key, state)
    }
  }

  const questionMap = new Map((questions ?? []).map((question) => [question.id, question]))

  const items = sharedKeys
    .map((itemKey) => {
      const partyAResponse = initiatorResponseMap.get(itemKey)!
      const partyBResponse = responderResponseMap.get(itemKey)!
      const question = questionMap.get(partyAResponse.question_id)

      if (!question) {
        return null
      }

      const state = stateMap.get(itemKey)
      const rawStatus = answersMatch(partyAResponse.answer_value, partyBResponse.answer_value)
        ? 'agreed'
        : 'gap'

      return {
        item_key: itemKey,
        question_id: question.id,
        child_id: partyAResponse.child_id,
        child_label: partyAResponse.child_id ? childMap.get(partyAResponse.child_id) ?? null : null,
        question_text: question.question_text,
        question_type: question.question_type,
        options: question.options,
        section: question.section,
        dispute_type: question.dispute_type,
        status: rawStatus,
        review_bucket: state?.review_bucket ?? (rawStatus === 'agreed' ? 'agreed' : 'to_review'),
        round_count: state?.round_count ?? 0,
        is_locked: Boolean(state?.locked_at),
        is_unresolved: Boolean(state?.unresolved_at),
        initiator_status: state?.initiator_status ?? 'pending',
        responder_status: state?.responder_status ?? 'pending',
        initiator_value: state?.initiator_value ?? null,
        responder_value: state?.responder_value ?? null,
        current_value:
          eventValueMap.get(itemKey) ??
          state?.responder_value ??
          state?.initiator_value ??
          null,
        party_a_answer: partyAResponse.answer_value,
        party_b_answer: partyBResponse.answer_value,
        guidance_text: question.guidance_text,
      } satisfies SafeComparisonItem
    })
    .filter((item): item is SafeComparisonItem => item !== null)

  return {
    viewer_role: viewerRole,
    summary: {
      agreed_count: items.filter((item) => item.review_bucket === 'agreed').length,
      gap_count: items.filter((item) => item.status === 'gap').length,
      disputed_count: items.filter((item) => item.review_bucket === 'disputed').length,
      to_review_count: items.filter((item) => item.review_bucket === 'to_review').length,
      locked_count: items.filter((item) => item.review_bucket === 'locked').length,
      unresolved_count: items.filter((item) => item.review_bucket === 'unresolved').length,
      total_compared: items.length,
      reviewed_count: items.filter((item) => item.review_bucket !== 'to_review').length,
    },
    items,
  }
}
