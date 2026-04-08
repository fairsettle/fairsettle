import type { Json } from '@/types/database'
import type { AnswerValue, ResolutionResult } from '@/lib/resolution/engine'
import type { SafeComparisonItem } from '@/lib/comparison'
import type { AiConfidence } from '@/types/ai'

export interface ResolutionSuggestion extends ResolutionResult, Pick<
  SafeComparisonItem,
  | 'item_key'
  | 'child_id'
  | 'child_label'
  | 'question_type'
  | 'options'
  | 'review_bucket'
  | 'round_count'
  | 'is_locked'
  | 'is_unresolved'
  | 'initiator_status'
  | 'responder_status'
  | 'current_value'
> {
  question_text: Json
  section: string
  dispute_type: 'child' | 'financial' | 'asset'
  mode: 'ai' | 'rule_based'
  ai_suggested_outcome: string | null
  ai_reasoning: string | null
  ai_confidence: AiConfidence | null
  ai_trade_off_note: string | null
  rule_based_suggestion: string | null
}

export interface ResolutionPayload {
  mode: 'ai' | 'rule_based'
  ai_disclaimer: string | null
  overall_summary: string | null
  key_trade_offs: string[]
  suggestions: ResolutionSuggestion[]
  viewer_role?: 'initiator' | 'responder'
  summary?: {
    agreed_count: number
    gap_count: number
    disputed_count: number
    to_review_count: number
    locked_count: number
    unresolved_count: number
    total_compared: number
    reviewed_count: number
  }
}
