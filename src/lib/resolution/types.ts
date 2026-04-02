import type { AnswerValue, ResolutionResult } from '@/lib/resolution/engine'

export interface ResolutionSuggestion extends ResolutionResult {
  question_text: Record<string, string>
  section: string
  dispute_type: 'child' | 'financial' | 'asset'
}

export interface ResolutionPayload {
  suggestions: ResolutionSuggestion[]
}
