import 'server-only'

import { z } from 'zod'

import { getAiDisclaimer } from '@/lib/ai/disclaimer'
import { isAiFeatureEnabled } from '@/lib/ai/flags'
import { createAiRequestHash, getCachedAiResponse, logAiCall } from '@/lib/ai/audit'
import { DEFAULT_AI_MODEL, runStructuredAiRequest } from '@/lib/ai/provider'
import { loadAiCaseData } from '@/lib/ai/case-data'
import { makeItemKey } from '@/lib/family-profile'
import { loadMessages } from '@/lib/messages'
import {
  buildComparisonItems,
  resolveItem,
  type AnswerValue,
  type CaseContext,
  type ComparisonItem as EngineComparisonItem,
  type QuestionRecord as ResolutionQuestionRecord,
  type RawResponse,
} from '@/lib/resolution/engine'
import { getLocalizedMessage } from '@/lib/questions'
import type { SafeComparisonItem } from '@/lib/comparison'
import type {
  AiResolutionContext,
  AiResolutionResponse,
} from '@/types/ai'
import type { Json } from '@/types/database'
import type { ResolutionPayload, ResolutionSuggestion } from '@/lib/resolution/types'

const RESOLUTION_MODEL = DEFAULT_AI_MODEL
type RawResponseWithChild = RawResponse & { child_id?: string | null }

const resolutionResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      item_key: z.string(),
      question_id: z.string(),
      suggested_outcome: z.string().min(1),
      reasoning: z.string().min(1),
      confidence: z.enum(['high', 'medium', 'low']),
      trade_off_note: z.string().nullable(),
    }),
  ),
  overall_summary: z.string().min(1),
  key_trade_offs: z.array(z.string()),
})

const SYSTEM_PROMPT = `You are a family dispute resolution assistant for FairSettle, a UK-based platform. You help separating parents find fair outcomes.

CRITICAL RULES:
1. You are NOT a solicitor. Never say "you should" or "you must". Always frame suggestions as "courts typically consider...", "a common arrangement is...", or "based on similar situations..."
2. Consider the FULL PICTURE, not individual questions in isolation. Income, childcare burden, housing needs, and children's welfare all interconnect.
3. The children's welfare is the paramount consideration, following the Children Act 1989 welfare checklist.
4. For financial matters, consider the Section 25 factors from the Matrimonial Causes Act 1973: income, earning capacity, property, financial needs, standard of living, age, disability, contributions, and conduct.
5. Suggest PRACTICAL, WORKABLE arrangements. A 50/50 time split is not practical if parents live 2 hours apart.
6. Where parents' positions are close, nudge toward the middle. Where they are far apart, explain what courts typically decide and why.
7. Identify potential trade-offs: if one parent concedes on X, the other could concede on Y.

Respond ONLY with valid JSON matching this structure:
{
  "suggestions": [
    {
      "item_key": "...",
      "question_id": "...",
      "suggested_outcome": "...",
      "reasoning": "...",
      "confidence": "high" | "medium" | "low",
      "trade_off_note": "..." | null
    }
  ],
  "overall_summary": "A 2-3 sentence summary of the case...",
  "key_trade_offs": ["If Parent A accepts X, Parent B could..."]
}`

function parseAnswerString(answerValue: AnswerValue | null | undefined) {
  if (!answerValue) {
    return undefined
  }

  return typeof answerValue.value === 'string' ? answerValue.value : undefined
}

function parseAnswerNumber(answerValue: AnswerValue | null | undefined) {
  if (!answerValue) {
    return undefined
  }

  return typeof answerValue.value === 'number' ? answerValue.value : undefined
}

function buildResolutionCaseContext({
  questions,
  initiatorResponses,
  responderResponses,
  childrenCount,
}: {
  questions: ResolutionQuestionRecord[]
  initiatorResponses: RawResponse[]
  responderResponses: RawResponse[]
  childrenCount: number
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
    children_count: childrenCount,
    initiator_income: initiatorIncome,
    responder_income: responderIncome,
    initiator_nights_answer: initiatorNightsAnswer,
    responder_nights_answer: responderNightsAnswer,
  }
}

function toEngineComparisonItem(item: SafeComparisonItem): EngineComparisonItem {
  return {
    question_id: item.question_id,
    question_type: item.question_type,
    question_text: item.question_text as Record<string, string>,
    section: item.section,
    dispute_type: item.dispute_type,
    party_a_answer: item.party_a_answer as EngineComparisonItem['party_a_answer'],
    party_b_answer: item.party_b_answer as EngineComparisonItem['party_b_answer'],
    guidance_text: item.guidance_text as Record<string, string> | null,
  }
}

function buildResolutionSuggestion(
  item: SafeComparisonItem,
  aiSuggestion: AiResolutionResponse['suggestions'][number] | undefined,
): ResolutionSuggestion {
  const resolution = resolveItem(toEngineComparisonItem(item))
  const currentValue =
    item.current_value &&
    typeof item.current_value === 'object' &&
    !Array.isArray(item.current_value)
      ? (item.current_value as typeof resolution.suggestion)
      : resolution.suggestion

  return {
    ...resolution,
    item_key: item.item_key,
    child_id: item.child_id,
    child_label: item.child_label,
    question_text: item.question_text,
    question_type: item.question_type,
    options: item.options,
    section: item.section,
    dispute_type: item.dispute_type,
    review_bucket: item.review_bucket,
    round_count: item.round_count,
    is_locked: item.is_locked,
    is_unresolved: item.is_unresolved,
    initiator_status: item.initiator_status,
    responder_status: item.responder_status,
    current_value: currentValue as unknown as ResolutionSuggestion['current_value'],
    mode: aiSuggestion ? 'ai' : 'rule_based',
    ai_suggested_outcome: aiSuggestion?.suggested_outcome ?? null,
    ai_reasoning: aiSuggestion?.reasoning ?? null,
    ai_confidence: aiSuggestion?.confidence ?? null,
    ai_trade_off_note: aiSuggestion?.trade_off_note ?? null,
    rule_based_suggestion: resolution.suggestion_label,
  }
}

function buildPartyResponses({
  responses,
  questions,
  childLabels,
}: {
  responses: RawResponseWithChild[]
  questions: ResolutionQuestionRecord[]
  childLabels: Record<string, string>
}): AiResolutionContext['party_a_responses'] {
  const questionById = new Map(questions.map((question) => [question.id, question]))

  return responses
    .map((response) => {
      const question = questionById.get(response.question_id)

      if (!question) {
        return null
      }

      const childLabel = response.child_id ? childLabels[response.child_id] ?? null : null
      const questionText = getLocalizedMessage(question.question_text, 'en')

      return {
        item_key: makeItemKey(response.question_id, response.child_id),
        question_id: response.question_id,
        section: question.section,
        question_text: childLabel ? `${questionText} (${childLabel})` : questionText,
        answer_value: response.answer_value?.value ?? null,
        child_id: response.child_id ?? null,
        child_label: childLabel,
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
}

async function getAiResolutionResponse({
  context,
  caseId,
  userId,
}: {
  context: AiResolutionContext
  caseId: string
  userId: string
}): Promise<AiResolutionResponse | null> {
  const auditInput = {
    system_prompt: SYSTEM_PROMPT,
    context,
  } as const
  const requestHash = createAiRequestHash(auditInput as unknown as Json)

  try {
    const cached = await getCachedAiResponse({
      caseId,
      feature: 'resolution_suggestions',
      requestHash,
      schema: resolutionResponseSchema,
    })

    if (cached) {
      return cached
    }

    const result = await runStructuredAiRequest({
      model: RESOLUTION_MODEL,
      schema: resolutionResponseSchema,
      schemaName: 'fairsettle_resolution_suggestions',
      systemPrompt: SYSTEM_PROMPT,
      input: `Here is the case data:\n${JSON.stringify(context, null, 2)}`,
      maxOutputTokens: 2_000,
      // Resolution prompts carry the full case context and can take longer
      // than narrative summaries, especially on first uncached generation.
      timeoutMs: 25_000,
    })

    await logAiCall({
      caseId,
      userId,
      feature: 'resolution_suggestions',
      model: RESOLUTION_MODEL,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      input: auditInput as unknown as Json,
      requestHash,
      response: result.parsed,
    })

    return result.parsed
  } catch {
    return null
  }
}

export async function getResolutionPayload({
  caseId,
  viewerUserId,
  locale,
}: {
  caseId: string
  viewerUserId: string
  locale: string
}): Promise<ResolutionPayload> {
  const aiCaseData = await loadAiCaseData({ caseId, viewerUserId })

  if (!aiCaseData.comparison) {
    return {
      mode: 'rule_based',
      ai_disclaimer: null,
      overall_summary: null,
      key_trade_offs: [],
      suggestions: [],
      viewer_role: aiCaseData.viewerRole,
      summary: undefined,
    }
  }

  const comparison = aiCaseData.comparison
  const resolutionQuestions = aiCaseData.questions as ResolutionQuestionRecord[]
  const initiatorResponses = aiCaseData.responses.filter(
    (response) => response.user_id === aiCaseData.caseItem.initiator_id,
  ) as RawResponseWithChild[]
  const responderResponses = aiCaseData.caseItem.responder_id
    ? (aiCaseData.responses.filter(
        (response) => response.user_id === aiCaseData.caseItem.responder_id,
      ) as RawResponseWithChild[])
    : []

  const caseContext = buildResolutionCaseContext({
    questions: resolutionQuestions,
    initiatorResponses,
    responderResponses,
    childrenCount: aiCaseData.initiatorProfile.children_count ?? 0,
  })

  const baselineItems = buildComparisonItems(
    resolutionQuestions,
    initiatorResponses,
    responderResponses,
    caseContext,
  )

  const baselineByQuestionId = new Map(
    baselineItems.map((item) => [item.question_id, item]),
  )

  const disagreedItems = comparison.items.filter((item) => item.status === 'gap')
  const ruleBasedSuggestions = disagreedItems.map((item) => {
    const resolution = resolveItem(
      baselineByQuestionId.get(item.question_id) ?? toEngineComparisonItem(item),
    )

    return {
      item_key: item.item_key,
      question_id: item.question_id,
      suggestion:
        (resolution.suggestion as unknown as AiResolutionContext['rule_based_suggestions'][number]['suggestion']) ??
        null,
      rule_applied: resolution.rule_applied,
    }
  })

  const aiContext: AiResolutionContext = {
    case_id: aiCaseData.caseItem.id,
    case_type: aiCaseData.caseItem.case_type,
    children_count: aiCaseData.initiatorProfile.children_count ?? 0,
    children_ages: aiCaseData.childAges,
    case_facts: {
      initiator_income: aiCaseData.caseFacts.initiatorIncome ?? undefined,
      responder_income: aiCaseData.caseFacts.responderIncome ?? undefined,
      income_disparity: aiCaseData.caseFacts.incomeDisparity,
      travel_time_between_homes: aiCaseData.caseFacts.travelTimeBetweenHomes,
      school_proximity: aiCaseData.caseFacts.schoolProximity,
      primary_carer_signal: aiCaseData.caseFacts.primaryCarerSignal,
      property_preference_party_a: aiCaseData.caseFacts.propertyPreferencePartyA,
      property_preference_party_b: aiCaseData.caseFacts.propertyPreferencePartyB,
    },
    party_a_responses: buildPartyResponses({
      responses: initiatorResponses,
      questions: resolutionQuestions,
      childLabels: aiCaseData.childLabels,
    }),
    party_b_responses: buildPartyResponses({
      responses: responderResponses,
      questions: resolutionQuestions,
      childLabels: aiCaseData.childLabels,
    }),
    disagreed_items: disagreedItems.map((item) => ({
      item_key: item.item_key,
      question_id: item.question_id,
      question_text: getLocalizedMessage(item.question_text, 'en'),
      section: item.section,
      party_a_answer:
        item.party_a_answer as unknown as AiResolutionContext['disagreed_items'][number]['party_a_answer'],
      party_b_answer:
        item.party_b_answer as unknown as AiResolutionContext['disagreed_items'][number]['party_b_answer'],
      guidance_text: item.guidance_text
        ? getLocalizedMessage(item.guidance_text, 'en')
        : null,
    })),
    rule_based_suggestions: ruleBasedSuggestions,
  }

  const aiResult =
    isAiFeatureEnabled('resolution') && aiContext.disagreed_items.length > 0
      ? await getAiResolutionResponse({
          context: aiContext,
          caseId,
          userId: viewerUserId,
        })
      : null

  const aiSuggestionMap = new Map(
    (aiResult?.suggestions ?? []).map((suggestion) => [suggestion.item_key, suggestion]),
  )

  const messages = await loadMessages(locale)

  return {
    mode: aiResult ? 'ai' : 'rule_based',
    ai_disclaimer: aiResult ? getAiDisclaimer(messages) : null,
    overall_summary: aiResult?.overall_summary ?? null,
    key_trade_offs: aiResult?.key_trade_offs ?? [],
    suggestions: disagreedItems.map((item) =>
      buildResolutionSuggestion(item, aiSuggestionMap.get(item.item_key)),
    ),
    viewer_role: comparison.viewer_role,
    summary: comparison.summary,
  }
}
