import 'server-only'

import { buildSafeComparisonPayload, type SafeComparisonPayload } from '@/lib/comparison'
import { formatChildLabel } from '@/lib/family-profile'
import { getDisputeTypesForCase } from '@/lib/questions'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

type CaseRow = Database['public']['Tables']['cases']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type QuestionRow = Database['public']['Tables']['questions']['Row']
type ResponseRow = Database['public']['Tables']['responses']['Row']
type ChildRow = Database['public']['Tables']['children']['Row']

export interface AiCaseFacts {
  initiatorIncome: number | null
  responderIncome: number | null
  incomeDisparity: number | null
  travelTimeBetweenHomes: string | null
  schoolProximity: string | null
  primaryCarerSignal: string | null
  propertyPreferencePartyA: string | null
  propertyPreferencePartyB: string | null
}

export interface AiCaseData {
  caseItem: CaseRow
  initiatorProfile: ProfileRow
  responderProfile: ProfileRow | null
  questions: QuestionRow[]
  responses: ResponseRow[]
  comparison: SafeComparisonPayload | null
  childAges: number[]
  childLabels: Record<string, string>
  caseFacts: AiCaseFacts
  viewerRole: 'initiator' | 'responder'
}

function calculateChildAge(dateOfBirth: string) {
  const birthDate = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate())

  if (!hasHadBirthdayThisYear) {
    age -= 1
  }

  return Math.max(age, 0)
}

function readAnswerString(answerValue: ResponseRow['answer_value']) {
  if (!answerValue || typeof answerValue !== 'object' || Array.isArray(answerValue)) {
    return null
  }

  return typeof answerValue.value === 'string' ? answerValue.value : null
}

function readAnswerNumber(answerValue: ResponseRow['answer_value']) {
  if (!answerValue || typeof answerValue !== 'object' || Array.isArray(answerValue)) {
    return null
  }

  return typeof answerValue.value === 'number' ? answerValue.value : null
}

function deriveCaseFacts({
  questions,
  initiatorResponses,
  responderResponses,
}: {
  questions: QuestionRow[]
  initiatorResponses: ResponseRow[]
  responderResponses: ResponseRow[]
}): AiCaseFacts {
  const questionById = new Map(questions.map((question) => [question.id, question]))

  let initiatorIncome: number | null = null
  let responderIncome: number | null = null
  let travelTimeBetweenHomes: string | null = null
  let schoolProximity: string | null = null
  let propertyPreferencePartyA: string | null = null
  let propertyPreferencePartyB: string | null = null

  for (const response of initiatorResponses) {
    const question = questionById.get(response.question_id)

    if (!question) {
      continue
    }

    const questionText =
      question.question_text &&
      typeof question.question_text === 'object' &&
      !Array.isArray(question.question_text)
        ? String(question.question_text.en ?? '').toLowerCase()
        : ''

    if (question.section === 'Income' && questionText.includes('gross annual income')) {
      initiatorIncome = readAnswerNumber(response.answer_value)
    }

    if (questionText.includes('how far apart do you live')) {
      travelTimeBetweenHomes = readAnswerString(response.answer_value)
    }

    if (questionText.includes('which parent lives closer to')) {
      schoolProximity = readAnswerString(response.answer_value)
    }

    if (questionText.includes('what do you think should happen with the property')) {
      propertyPreferencePartyA = readAnswerString(response.answer_value)
    }
  }

  for (const response of responderResponses) {
    const question = questionById.get(response.question_id)

    if (!question) {
      continue
    }

    const questionText =
      question.question_text &&
      typeof question.question_text === 'object' &&
      !Array.isArray(question.question_text)
        ? String(question.question_text.en ?? '').toLowerCase()
        : ''

    if (question.section === 'Income' && questionText.includes('gross annual income')) {
      responderIncome = readAnswerNumber(response.answer_value)
    }

    if (!travelTimeBetweenHomes && questionText.includes('how far apart do you live')) {
      travelTimeBetweenHomes = readAnswerString(response.answer_value)
    }

    if (!schoolProximity && questionText.includes('which parent lives closer to')) {
      schoolProximity = readAnswerString(response.answer_value)
    }

    if (questionText.includes('what do you think should happen with the property')) {
      propertyPreferencePartyB = readAnswerString(response.answer_value)
    }
  }

  const incomeDisparity =
    initiatorIncome !== null && responderIncome !== null
      ? Math.abs(initiatorIncome - responderIncome)
      : null

  let primaryCarerSignal: string | null = null

  if (schoolProximity === 'Me') {
    primaryCarerSignal = 'Parent A reports living closer to the children’s school or childcare setting.'
  } else if (schoolProximity === 'The other parent') {
    primaryCarerSignal = 'Parent B is reported as living closer to the children’s school or childcare setting.'
  } else if (schoolProximity === 'About the same distance') {
    primaryCarerSignal = 'Both parents report similar proximity to the children’s school or childcare setting.'
  }

  return {
    initiatorIncome,
    responderIncome,
    incomeDisparity,
    travelTimeBetweenHomes,
    schoolProximity,
    primaryCarerSignal,
    propertyPreferencePartyA,
    propertyPreferencePartyB,
  }
}

export async function loadAiCaseData({
  caseId,
  viewerUserId,
}: {
  caseId: string
  viewerUserId: string
}): Promise<AiCaseData> {
  const caseResult = await supabaseAdmin.from('cases').select('*').eq('id', caseId).single()

  if (caseResult.error || !caseResult.data) {
    throw new Error(caseResult.error?.message ?? 'Case not found')
  }

  const caseItem = caseResult.data
  const disputeTypes = getDisputeTypesForCase(caseItem.case_type)

  const [
    initiatorProfileResult,
    responderProfileResult,
    questionsResult,
    responsesResult,
    childrenResult,
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').eq('id', caseItem.initiator_id).single(),
    caseItem.responder_id
      ? supabaseAdmin.from('profiles').select('*').eq('id', caseItem.responder_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabaseAdmin
      .from('questions')
      .select('*')
      .eq('question_set_version', caseItem.question_set_version)
      .in('dispute_type', disputeTypes)
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabaseAdmin
      .from('responses')
      .select('*')
      .eq('case_id', caseId)
      .not('submitted_at', 'is', null)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('children')
      .select('id, first_name, date_of_birth, sort_order')
      .eq('case_id', caseId)
      .order('sort_order', { ascending: true }),
  ])

  if (initiatorProfileResult.error || !initiatorProfileResult.data) {
    throw new Error(initiatorProfileResult.error?.message ?? 'Initiator not found')
  }

  if (questionsResult.error) {
    throw new Error(questionsResult.error.message)
  }

  if (responsesResult.error) {
    throw new Error(responsesResult.error.message)
  }

  if (childrenResult.error) {
    throw new Error(childrenResult.error.message)
  }

  const viewerRole =
    viewerUserId === caseItem.responder_id ? 'responder' : 'initiator'

  const children = (childrenResult.data ?? []) as ChildRow[]
  const childLabels = Object.fromEntries(
    children.map((child, index) => [child.id, formatChildLabel(child, index)]),
  )
  const initiatorResponses = (responsesResult.data ?? []).filter(
    (response) => response.user_id === caseItem.initiator_id,
  )
  const responderResponses = (responsesResult.data ?? []).filter(
    (response) => response.user_id === caseItem.responder_id,
  )

  let comparison: SafeComparisonPayload | null = null

  if (caseItem.responder_id) {
    comparison = await buildSafeComparisonPayload({
      caseType: caseItem.case_type,
      caseId,
      initiatorId: caseItem.initiator_id,
      responderId: caseItem.responder_id,
      viewerRole,
      questionSetVersion: caseItem.question_set_version,
    })
  }

  return {
    caseItem,
    initiatorProfile: initiatorProfileResult.data,
    responderProfile: responderProfileResult.data ?? null,
    questions: questionsResult.data ?? [],
    responses: responsesResult.data ?? [],
    comparison,
    childAges: children.map((child) => calculateChildAge(child.date_of_birth)),
    childLabels,
    caseFacts: deriveCaseFacts({
      questions: questionsResult.data ?? [],
      initiatorResponses,
      responderResponses,
    }),
    viewerRole,
  }
}
