import type { Json } from '@/types/database'
import type { AnswerValue, ResolutionResult } from '@/lib/resolution/engine'
import type { SafeComparisonItem } from '@/lib/comparison'

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
}

export interface ResolutionPayload {
  suggestions: ResolutionSuggestion[]
}
