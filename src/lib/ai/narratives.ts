import 'server-only'

import { z } from 'zod'

import { getAiDisclaimer } from '@/lib/ai/disclaimer'
import { isAiFeatureEnabled } from '@/lib/ai/flags'
import { createAiRequestHash, getCachedAiResponse, logAiCall } from '@/lib/ai/audit'
import { DEFAULT_AI_MODEL, runTextAiRequest } from '@/lib/ai/provider'
import { loadAiCaseData } from '@/lib/ai/case-data'
import { formatAnswerValue, getLocalizedMessage } from '@/lib/questions'
import { loadMessages } from '@/lib/messages'
import type { AiNarrativeSummary } from '@/types/ai'
import type { Json } from '@/types/database'

const NARRATIVE_MODEL = DEFAULT_AI_MODEL
const narrativeResponseSchema = z.object({
  text: z.string().min(1),
})

const NARRATIVE_PROMPT = `You are writing a professional case summary for a family dispute resolution platform called FairSettle.

Write a clear, neutral, factual summary of the case. The tone should be professional but accessible — a separating parent should understand every word, but a solicitor should also find it useful.

Structure:
1. Opening: One sentence describing the case type and parties.
2. Areas of agreement: List what both parents agree on, in plain English.
3. Areas of disagreement: Describe each gap factually, without taking sides.
4. Context: Note relevant factors (income disparity, distance between homes, children’s ages, primary carer status) that a court would consider.
5. Next steps: What options are available (accept suggestions, modify, escalate to mediation, or use the case pack in court).

RULES:
- Maximum 300 words
- Never use legal jargon without explaining it
- Never take sides or assign blame
- Never give legal advice
- Refer to parties as "Parent A" and "Parent B", not by name
- Use British English spelling and terminology

Respond with plain text only, no JSON, no markdown.`

function buildRuleBasedSummary(caseTypeLabel: string, agreedCount: number, gapCount: number) {
  return `This ${caseTypeLabel.toLowerCase()} case currently includes ${agreedCount} areas of agreement and ${gapCount} areas that still need review. The next step is to compare the suggested outcomes, adjust any points that do not feel workable, and use the case pack if you need mediation or legal support.`
}

export async function getNarrativeSummaryForCase({
  caseId,
  viewerUserId,
  locale,
}: {
  caseId: string
  viewerUserId: string
  locale: string
}): Promise<AiNarrativeSummary> {
  const aiCaseData = await loadAiCaseData({ caseId, viewerUserId })
  const messages = await loadMessages(locale)

  if (!aiCaseData.comparison || !isAiFeatureEnabled('narratives')) {
    return {
      text: buildRuleBasedSummary(
        aiCaseData.caseItem.case_type,
        aiCaseData.comparison?.summary.agreed_count ?? 0,
        aiCaseData.comparison?.summary.gap_count ?? 0,
      ),
      feature: 'narrative_summary',
      mode: 'rule_based',
    }
  }

  const comparison = aiCaseData.comparison
  const promptInput = {
    case_type: aiCaseData.caseItem.case_type,
    children_count: aiCaseData.initiatorProfile.children_count ?? 0,
    children_ages: aiCaseData.childAges,
    case_facts: {
      initiator_income: aiCaseData.caseFacts.initiatorIncome,
      responder_income: aiCaseData.caseFacts.responderIncome,
      income_disparity: aiCaseData.caseFacts.incomeDisparity,
      travel_time_between_homes: aiCaseData.caseFacts.travelTimeBetweenHomes,
      school_proximity: aiCaseData.caseFacts.schoolProximity,
      primary_carer_signal: aiCaseData.caseFacts.primaryCarerSignal,
      property_preference_parent_a: aiCaseData.caseFacts.propertyPreferencePartyA,
      property_preference_parent_b: aiCaseData.caseFacts.propertyPreferencePartyB,
    },
    agreed_items: comparison.items
      .filter((item) => item.status === 'agreed')
      .slice(0, 8)
      .map((item) => ({
        question: getLocalizedMessage(item.question_text, 'en'),
        answer: formatAnswerValue(item.party_a_answer as never),
      })),
    disagreed_items: comparison.items
      .filter((item) => item.status === 'gap')
      .map((item) => ({
        question: getLocalizedMessage(item.question_text, 'en'),
        parent_a: formatAnswerValue(item.party_a_answer as never),
        parent_b: formatAnswerValue(item.party_b_answer as never),
      })),
    context: {
      next_step:
        'Both parents can review the suggested outcomes, modify their positions, or download the case pack to take to a mediator or solicitor.',
    },
  }
  const auditInput = {
    system_prompt: NARRATIVE_PROMPT,
    context: promptInput,
  } as const
  const requestHash = createAiRequestHash(auditInput as unknown as Json)

  try {
    const cached = await getCachedAiResponse({
      caseId,
      feature: 'narrative_summary',
      requestHash,
      schema: narrativeResponseSchema,
    })

    if (cached) {
      return {
        text: cached.text,
        feature: 'narrative_summary',
        mode: 'ai',
      }
    }

    const result = await runTextAiRequest({
      model: NARRATIVE_MODEL,
      systemPrompt: NARRATIVE_PROMPT,
      input: `Here is the case data:\n${JSON.stringify(promptInput, null, 2)}`,
      maxOutputTokens: 900,
      timeoutMs: 12_000,
    })
    const text = result.text

    await logAiCall({
      caseId,
      userId: viewerUserId,
      feature: 'narrative_summary',
      model: NARRATIVE_MODEL,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      input: auditInput as unknown as Json,
      requestHash,
      response: {
        text,
        disclaimer: getAiDisclaimer(messages),
      },
    })

    return {
      text,
      feature: 'narrative_summary',
      mode: 'ai',
    }
  } catch {
    return {
      text: buildRuleBasedSummary(
        aiCaseData.caseItem.case_type,
        comparison.summary.agreed_count,
        comparison.summary.gap_count,
      ),
      feature: 'narrative_summary',
      mode: 'rule_based',
    }
  }
}
