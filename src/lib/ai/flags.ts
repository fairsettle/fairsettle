import 'server-only'

export type AiFeatureFlag =
  | 'resolution'
  | 'narratives'
  | 'tone_analysis'
  | 'cultural_adaptation'

const FEATURE_ENV_MAP: Record<AiFeatureFlag, string> = {
  resolution: 'FEATURE_AI_RESOLUTION',
  narratives: 'FEATURE_AI_NARRATIVES',
  tone_analysis: 'FEATURE_AI_TONE_ANALYSIS',
  cultural_adaptation: 'FEATURE_AI_CULTURAL_ADAPTATION',
}

export function isAiFeatureEnabled(feature: AiFeatureFlag) {
  return process.env[FEATURE_ENV_MAP[feature]] === 'true'
}
