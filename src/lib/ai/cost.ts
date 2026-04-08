import 'server-only'

import type { AiFeature } from '@/types/ai'

const INPUT_COST_PER_MILLION_GBP: Record<AiFeature, number> = {
  resolution_suggestions: 0.0024,
  narrative_summary: 0.0024,
  tone_analysis: 0.0024,
  cultural_adaptation: 0.0024,
}

const OUTPUT_COST_PER_MILLION_GBP: Record<AiFeature, number> = {
  resolution_suggestions: 0.012,
  narrative_summary: 0.012,
  tone_analysis: 0.012,
  cultural_adaptation: 0.012,
}

const DEFAULT_FEATURE_COST_GBP: Record<AiFeature, number> = {
  resolution_suggestions: 0.03,
  narrative_summary: 0.02,
  tone_analysis: 0.01,
  cultural_adaptation: 0.01,
}

export function estimateAiCost({
  feature,
  inputTokens,
  outputTokens,
}: {
  feature: AiFeature
  inputTokens?: number | null
  outputTokens?: number | null
}) {
  if (
    typeof inputTokens !== 'number' ||
    typeof outputTokens !== 'number' ||
    inputTokens < 0 ||
    outputTokens < 0
  ) {
    return DEFAULT_FEATURE_COST_GBP[feature]
  }

  return Number(
    (
      (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION_GBP[feature] +
      (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION_GBP[feature]
    ).toFixed(4),
  )
}
