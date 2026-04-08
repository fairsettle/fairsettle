import 'server-only'

import { z } from 'zod'

import { isAiFeatureEnabled } from '@/lib/ai/flags'
import { createAiRequestHash, logAiCall } from '@/lib/ai/audit'
import { DEFAULT_AI_MODEL, runStructuredAiRequest } from '@/lib/ai/provider'
import type { AiToneAnalysis } from '@/types/ai'
import type { Json } from '@/types/database'

const TONE_MODEL = DEFAULT_AI_MODEL

const toneAnalysisSchema = z.object({
  risk_level: z.enum(['none', 'low', 'medium', 'high', 'critical']),
  patterns_detected: z.array(z.string()),
  explanation: z.string(),
  recommended_action: z.enum([
    'none',
    'log',
    'flag_for_review',
    'signpost_support',
    'immediate_review',
  ]),
})

const TONE_ANALYSIS_PROMPT = `You are a safeguarding analyst for a family dispute resolution platform. Analyse the following text submitted by a parent during a case.

Context: This text was flagged by automated moderation. You are reviewing it for subtle manipulation patterns that basic moderation might miss.

Analyse for:
- Financial coercion or economic abuse
- Parental alienation language
- Gaslighting or reality distortion
- Veiled threats or intimidation
- Signs of third-party coaching
- Withdrawal as manipulation

Respond with JSON:
{
  "risk_level": "none" | "low" | "medium" | "high" | "critical",
  "patterns_detected": ["financial_coercion"],
  "explanation": "...",
  "recommended_action": "none" | "log" | "flag_for_review" | "signpost_support" | "immediate_review"
}`

export async function getDeepToneAnalysis({
  caseId,
  userId,
  previousTexts,
  flaggedText,
}: {
  caseId: string
  userId: string
  previousTexts: string[]
  flaggedText: string
}): Promise<AiToneAnalysis | null> {
  if (!isAiFeatureEnabled('tone_analysis')) {
    return null
  }

  const auditInput = {
    system_prompt: TONE_ANALYSIS_PROMPT,
    context: {
      previous_texts: previousTexts,
      flagged_text: flaggedText,
    },
  } as const
  const requestHash = createAiRequestHash(auditInput as unknown as Json)

  try {
    const result = await runStructuredAiRequest({
      model: TONE_MODEL,
      schema: toneAnalysisSchema,
      schemaName: 'fairsettle_tone_analysis',
      systemPrompt: TONE_ANALYSIS_PROMPT,
      input: JSON.stringify(
        {
          previous_texts: previousTexts,
          flagged_text: flaggedText,
        },
        null,
        2,
      ),
      maxOutputTokens: 700,
      timeoutMs: 10_000,
    })

    await logAiCall({
      caseId,
      userId,
      feature: 'tone_analysis',
      model: TONE_MODEL,
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
