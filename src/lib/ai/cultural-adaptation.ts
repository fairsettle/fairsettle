import 'server-only'

import { DEFAULT_AI_MODEL, runTextAiRequest } from '@/lib/ai/provider'
import { isAiFeatureEnabled } from '@/lib/ai/flags'
import { createAiRequestHash, logAiCall } from '@/lib/ai/audit'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AiGuidanceAdaptation } from '@/types/ai'
import { coerceSupportedLocale } from '@/lib/locale-path'
import type { Json } from '@/types/database'

const CULTURAL_MODEL = DEFAULT_AI_MODEL

const CULTURAL_ADAPTATION_PROMPT = `You are a legal concepts translator for FairSettle, helping parents understand UK family law in their own language and cultural context.

RULES:
- Write entirely in the requested language
- If a similar concept exists in the user's home legal system, reference it as a bridge ("This is similar to...")
- If no equivalent exists, explain the UK concept from scratch using simple, non-legal language
- Maximum 100 words
- Be culturally sensitive — acknowledge that family structures and expectations may differ
- Never give legal advice specific to the user's home country`

const CULTURAL_CONTEXT_LABEL: Record<string, string> = {
  pl: 'Polish',
  ro: 'Romanian',
  ar: 'Arabic-speaking',
  es: 'Spanish-speaking',
  fr: 'French-speaking',
  de: 'German-speaking',
}

export async function getGuidanceAdaptation({
  questionId,
  language,
  guidanceText,
}: {
  questionId: string
  language: string
  guidanceText: string
}): Promise<AiGuidanceAdaptation> {
  const locale = coerceSupportedLocale(language)

  if (locale === 'en' || !guidanceText.trim()) {
    return { text: guidanceText, mode: 'static' }
  }

  const cached = await supabaseAdmin
    .from('ai_translations')
    .select('adapted_text')
    .eq('question_id', questionId)
    .eq('language', locale)
    .maybeSingle()

  if (cached.data?.adapted_text) {
    return {
      text: cached.data.adapted_text,
      mode: 'ai',
    }
  }

  if (!isAiFeatureEnabled('cultural_adaptation')) {
    return { text: guidanceText, mode: 'static' }
  }

  const auditInput = {
    system_prompt: CULTURAL_ADAPTATION_PROMPT,
    context: {
      language: locale,
      cultural_context: CULTURAL_CONTEXT_LABEL[locale] ?? locale,
      guidance_text: guidanceText,
    },
  } as const
  const requestHash = createAiRequestHash(auditInput as unknown as Json)

  try {
    const result = await runTextAiRequest({
      model: CULTURAL_MODEL,
      systemPrompt: CULTURAL_ADAPTATION_PROMPT,
      input: JSON.stringify(
        {
          language: locale,
          cultural_context: CULTURAL_CONTEXT_LABEL[locale] ?? locale,
          guidance_text: guidanceText,
        },
        null,
        2,
      ),
      maxOutputTokens: 350,
      timeoutMs: 10_000,
    })

    const adaptedText = result.text

    if (!adaptedText) {
      return { text: guidanceText, mode: 'static' }
    }

    await supabaseAdmin.from('ai_translations').upsert(
      {
        question_id: questionId,
        language: locale,
        adapted_text: adaptedText,
      },
      { onConflict: 'question_id,language' },
    )

    await logAiCall({
      feature: 'cultural_adaptation',
      model: CULTURAL_MODEL,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      input: auditInput as unknown as Json,
      requestHash,
      response: {
        question_id: questionId,
        language: locale,
        adapted_text: adaptedText,
      },
    })

    return {
      text: adaptedText,
      mode: 'ai',
    }
  } catch {
    return { text: guidanceText, mode: 'static' }
  }
}
