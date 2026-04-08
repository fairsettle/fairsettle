import type { Json } from '@/types/database'

export type AiFeature =
  | 'resolution_suggestions'
  | 'narrative_summary'
  | 'tone_analysis'
  | 'cultural_adaptation'

export type AiConfidence = 'high' | 'medium' | 'low'

export interface AiLogPayload {
  caseId?: string | null
  userId?: string | null
  feature: AiFeature
  model: string
  inputTokens?: number | null
  outputTokens?: number | null
  costEstimate?: number | null
  input?: Json | null
  requestHash?: string | null
  response: Json
}

export interface AiNarrativeSummary {
  text: string
  feature: 'narrative_summary'
  mode: 'ai' | 'rule_based'
}

export interface AiResolutionContextItem {
  item_key: string
  question_id: string
  section: string
  question_text: string
  answer_value: Json
  child_id?: string | null
  child_label?: string | null
}

export interface AiResolutionDisagreedItem {
  item_key: string
  question_id: string
  question_text: string
  section: string
  party_a_answer: Json
  party_b_answer: Json
  guidance_text: string | null
}

export interface AiRuleBasedSuggestion {
  item_key: string
  question_id: string
  suggestion: Json | null
  rule_applied: string
}

export interface AiResolutionContext {
  case_id: string
  case_type: 'child' | 'financial' | 'asset' | 'combined'
  children_count: number
  children_ages?: number[]
  case_facts?: {
    initiator_income?: number
    responder_income?: number
    income_disparity?: number | null
    travel_time_between_homes?: string | null
    school_proximity?: string | null
    primary_carer_signal?: string | null
    property_preference_party_a?: string | null
    property_preference_party_b?: string | null
  }
  party_a_responses: AiResolutionContextItem[]
  party_b_responses: AiResolutionContextItem[]
  disagreed_items: AiResolutionDisagreedItem[]
  rule_based_suggestions: AiRuleBasedSuggestion[]
}

export interface AiResolutionSuggestion {
  item_key: string
  question_id: string
  suggested_outcome: string
  reasoning: string
  confidence: AiConfidence
  trade_off_note: string | null
}

export interface AiResolutionResponse {
  suggestions: AiResolutionSuggestion[]
  overall_summary: string
  key_trade_offs: string[]
}

export type ToneRiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical'
export type ToneRecommendedAction =
  | 'none'
  | 'log'
  | 'flag_for_review'
  | 'signpost_support'
  | 'immediate_review'

export interface AiToneAnalysis {
  risk_level: ToneRiskLevel
  patterns_detected: string[]
  explanation: string
  recommended_action: ToneRecommendedAction
}

export interface AiGuidanceAdaptation {
  text: string
  mode: 'ai' | 'static'
}
