import { NextResponse } from 'next/server'

import { getAuthorizedCase } from '@/lib/cases/auth'
import {
  buildComparisonItems,
  resolveAll,
  type AnswerValue,
  type CaseContext,
  type QuestionRecord,
  type RawResponse,
} from '@/lib/resolution/engine'
import type { Database } from '@/types/database'
import { supabaseAdmin } from '@/lib/supabase/admin'

function parseAnswerString(answerValue: AnswerValue | null | undefined) {
  if (!answerValue) {
    return undefined
  }

  const value = answerValue.value
  return typeof value === 'string' ? value : undefined
}

function parseAnswerNumber(answerValue: AnswerValue | null | undefined) {
  if (!answerValue) {
    return undefined
  }

  const value = answerValue.value
  return typeof value === 'number' ? value : undefined
}

function buildCaseContext({
  questions,
  initiatorResponses,
  responderResponses,
  initiatorProfile,
}: {
  questions: QuestionRecord[]
  initiatorResponses: RawResponse[]
  responderResponses: RawResponse[]
  initiatorProfile: Database['public']['Tables']['profiles']['Row'] | null
}): CaseContext {
  const questionById = new Map(questions.map((question) => [question.id, question]))

  let initiatorIncome: number | undefined
  let responderIncome: number | undefined
  let initiatorNightsAnswer: string | undefined
  let responderNightsAnswer: string | undefined

  for (const response of initiatorResponses) {
    const question = questionById.get(response.question_id)

    if (!question) {
      continue
    }

    const questionText = question.question_text.en?.toLowerCase() ?? ''

    if (question.section === 'Income' && questionText.includes('gross annual income')) {
      initiatorIncome = parseAnswerNumber(response.answer_value)
    }

    if (question.section === 'Weekly schedule' && questionText.includes('how many nights per week')) {
      initiatorNightsAnswer = parseAnswerString(response.answer_value)
    }
  }

  for (const response of responderResponses) {
    const question = questionById.get(response.question_id)

    if (!question) {
      continue
    }

    const questionText = question.question_text.en?.toLowerCase() ?? ''

    if (question.section === 'Income' && questionText.includes('gross annual income')) {
      responderIncome = parseAnswerNumber(response.answer_value)
    }

    if (question.section === 'Weekly schedule' && questionText.includes('how many nights per week')) {
      responderNightsAnswer = parseAnswerString(response.answer_value)
    }
  }

  return {
    children_count: initiatorProfile?.children_count ?? 0,
    initiator_income: initiatorIncome,
    responder_income: responderIncome,
    initiator_nights_answer: initiatorNightsAnswer,
    responder_nights_answer: responderNightsAnswer,
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { caseId: string } },
) {
  const { user, caseItem, response } = await getAuthorizedCase(params.caseId)

  if (response) {
    return response
  }
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!caseItem) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  if (!caseItem.responder_id) {
    return NextResponse.json({ error: 'Resolution not ready' }, { status: 409 })
  }

  const [initiatorResponsesResult, responderResponsesResult, questionsResult, initiatorProfileResult] =
    await Promise.all([
      supabaseAdmin
        .from('responses')
        .select('question_id, answer_value, submitted_at')
        .eq('case_id', params.caseId)
        .eq('user_id', caseItem.initiator_id)
        .not('submitted_at', 'is', null),
      supabaseAdmin
        .from('responses')
        .select('question_id, answer_value, submitted_at')
        .eq('case_id', params.caseId)
        .eq('user_id', caseItem.responder_id)
        .not('submitted_at', 'is', null),
      supabaseAdmin
        .from('questions')
        .select('id, dispute_type, section, question_text, question_type, options, guidance_text, display_order')
        .eq('is_active', true)
        .in(
          'dispute_type',
          caseItem.case_type === 'combined'
            ? ['child', 'financial', 'asset']
            : [caseItem.case_type],
        )
        .order('display_order', { ascending: true }),
      supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', caseItem.initiator_id)
        .maybeSingle(),
    ])

  if (initiatorResponsesResult.error || responderResponsesResult.error || questionsResult.error) {
    return NextResponse.json(
      {
        error:
          initiatorResponsesResult.error?.message ||
          responderResponsesResult.error?.message ||
          questionsResult.error?.message ||
          'Unable to build resolution data',
      },
      { status: 400 },
    )
  }

  const initiatorResponses = (initiatorResponsesResult.data ?? []) as RawResponse[]
  const responderResponses = (responderResponsesResult.data ?? []) as RawResponse[]

  if (!initiatorResponses.length || !responderResponses.length) {
    return NextResponse.json({ error: 'Resolution not ready' }, { status: 409 })
  }

  const questions = (questionsResult.data ?? []) as QuestionRecord[]
  const context = buildCaseContext({
    questions,
    initiatorResponses,
    responderResponses,
    initiatorProfile: initiatorProfileResult.data ?? null,
  })

  const comparisonItems = buildComparisonItems(
    questions,
    initiatorResponses,
    responderResponses,
    context,
  )

  const resolutionSummary = resolveAll(comparisonItems)

  const suggestions = resolutionSummary.results
    .filter((result) => result.status === 'gap')
    .map((result) => {
      const sourceItem = comparisonItems.find((item) => item.question_id === result.question_id)

      if (!sourceItem) {
        return null
      }

      return {
        ...result,
        question_text: sourceItem.question_text,
        section: sourceItem.section,
        dispute_type: sourceItem.dispute_type,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  return NextResponse.json({ suggestions })
}
