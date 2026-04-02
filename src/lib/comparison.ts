import type { Database, Json } from '@/types/database'

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
  total_compared: number
}

export interface SafeComparisonItem {
  question_id: string
  question_text: QuestionRow['question_text']
  section: string
  dispute_type: DisputeType
  status: 'agreed' | 'gap'
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
}: {
  caseType: CaseType
  caseId: string
  initiatorId: string
  responderId: string
  viewerRole: ViewerRole
}): Promise<SafeComparisonPayload> {
  const disputeTypes = getDisputeTypesForCase(caseType)

  const [initiatorResponsesResult, responderResponsesResult, questionsResult] = await Promise.all([
    supabaseAdmin
      .from('responses')
      .select('question_id, answer_value, submitted_at')
      .eq('case_id', caseId)
      .eq('user_id', initiatorId)
      .not('submitted_at', 'is', null),
    supabaseAdmin
      .from('responses')
      .select('question_id, answer_value, submitted_at')
      .eq('case_id', caseId)
      .eq('user_id', responderId)
      .not('submitted_at', 'is', null),
    supabaseAdmin
      .from('questions')
      .select('id, question_text, section, dispute_type, guidance_text, display_order')
      .in('dispute_type', disputeTypes)
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
  ])

  const initiatorResponses = initiatorResponsesResult.data ?? []
  const responderResponses = responderResponsesResult.data ?? []
  const questions = questionsResult.data ?? []

  if (initiatorResponsesResult.error) {
    throw new Error(initiatorResponsesResult.error.message)
  }

  if (responderResponsesResult.error) {
    throw new Error(responderResponsesResult.error.message)
  }

  if (questionsResult.error) {
    throw new Error(questionsResult.error.message)
  }

  const initiatorResponseMap = new Map(initiatorResponses.map((response) => [response.question_id, response]))
  const responderResponseMap = new Map(responderResponses.map((response) => [response.question_id, response]))

  const items = questions
    .filter(
      (question) =>
        initiatorResponseMap.has(question.id) && responderResponseMap.has(question.id),
    )
    .map((question) => {
      const partyAResponse = initiatorResponseMap.get(question.id)!
      const partyBResponse = responderResponseMap.get(question.id)!
      const status = answersMatch(partyAResponse.answer_value, partyBResponse.answer_value)
        ? 'agreed'
        : 'gap'

      return {
        question_id: question.id,
        question_text: question.question_text,
        section: question.section,
        dispute_type: question.dispute_type,
        status,
        party_a_answer: partyAResponse.answer_value,
        party_b_answer: partyBResponse.answer_value,
        guidance_text: question.guidance_text,
      } satisfies SafeComparisonItem
    })

  return {
    viewer_role: viewerRole,
    summary: {
      agreed_count: items.filter((item) => item.status === 'agreed').length,
      gap_count: items.filter((item) => item.status === 'gap').length,
      total_compared: items.length,
    },
    items,
  }
}
