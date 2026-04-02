'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getLocalizedMessage } from '@/lib/questions'
import type { ResolutionSuggestion } from '@/lib/resolution/types'

type ResolutionActionState = 'idle' | 'accept' | 'modify' | 'reject'

function getCategoryClassName(disputeType: ResolutionSuggestion['dispute_type']) {
  if (disputeType === 'child') {
    return 'border-brand/10 bg-brand-soft text-brand-strong'
  }

  if (disputeType === 'financial') {
    return 'border-warning/10 bg-warning-soft text-warning-foreground'
  }

  return 'border-line bg-surface-soft text-ink'
}

function getPositionTone(side: 'you' | 'them') {
  return side === 'you'
    ? 'border-brand/15 bg-surface-brand text-ink'
    : 'border-danger/15 bg-danger-soft text-ink'
}

function formatAnswer(answer: ResolutionSuggestion['party_a_answer']) {
  if (Array.isArray(answer.values)) {
    return answer.values.join(', ')
  }

  if (answer.value === undefined || answer.value === null) {
    return ''
  }

  return String(answer.value)
}

export function SuggestionCard({
  suggestion,
  onDecisionSaved,
  viewerRole,
}: {
  suggestion: ResolutionSuggestion
  onDecisionSaved: (questionId: string, action: 'accept' | 'modify' | 'reject', modifiedValue?: string) => Promise<void>
  viewerRole: 'initiator' | 'responder'
}) {
  const locale = useLocale()
  const t = useTranslations()
  const [decisionState, setDecisionState] = useState<ResolutionActionState>('idle')
  const [modifiedValue, setModifiedValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const yourAnswer =
    viewerRole === 'initiator' ? suggestion.party_a_answer : suggestion.party_b_answer
  const theirAnswer =
    viewerRole === 'initiator' ? suggestion.party_b_answer : suggestion.party_a_answer

  async function submitDecision(action: 'accept' | 'modify' | 'reject') {
    setErrorMessage('')
    setIsSaving(true)

    try {
      await onDecisionSaved(
        suggestion.question_id,
        action,
        action === 'modify' ? modifiedValue : undefined,
      )
      setDecisionState(action)
    } catch {
      setErrorMessage(t('resolution.saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="app-panel">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getCategoryClassName(suggestion.dispute_type)} variant="outline">
              {t(`caseTypes.${suggestion.dispute_type}`)}
            </Badge>
            <Badge className="border-line bg-surface-soft text-ink" variant="outline">
              {suggestion.section}
            </Badge>
          </div>
          <h2 className="text-xl font-semibold text-ink">
            {getLocalizedMessage(suggestion.question_text, locale)}
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className={`rounded-[1.5rem] border px-4 py-4 text-sm leading-6 ${getPositionTone('you')}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
              {t('resolution.youLabel')}
            </p>
            <p className="mt-2 font-medium">{formatAnswer(yourAnswer)}</p>
          </div>
          <div className={`rounded-[1.5rem] border px-4 py-4 text-sm leading-6 ${getPositionTone('them')}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
              {t('resolution.themLabel')}
            </p>
            <p className="mt-2 font-medium">{formatAnswer(theirAnswer)}</p>
          </div>
        </div>

        {suggestion.rule_applied === 'show_guidance_only' ? (
          <div className="app-note bg-surface-soft px-4 py-4 text-sm leading-6 text-ink">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
              {t('resolution.guidanceOnly')}
            </p>
            <p className="mt-2">
              {getLocalizedMessage(suggestion.guidance_text, locale)}
            </p>
          </div>
        ) : (
          <>
            <div className="app-panel-brand px-4 py-4 text-ink">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-strong">
                {t('resolution.suggestedOutcome')}
              </p>
              <p className="mt-2 text-xl font-semibold">
                {suggestion.suggestion_label}
              </p>
              {suggestion.context_note ? (
                <p className="mt-2 text-sm italic leading-6 text-ink-soft">
                  {suggestion.context_note}
                </p>
              ) : null}
            </div>

            {decisionState === 'modify' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink" htmlFor={`modify-${suggestion.question_id}`}>
                  {t('resolution.modifyLabel')}
                </label>
                <Input
                  id={`modify-${suggestion.question_id}`}
                  maxLength={500}
                  placeholder={t('resolution.modifyPlaceholder')}
                  value={modifiedValue}
                  onChange={(event) => setModifiedValue(event.target.value)}
                />
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                className="h-12 rounded-[1.25rem]"
                disabled={isSaving}
                type="button"
                variant={decisionState === 'accept' ? 'default' : 'outline'}
                onClick={() => void submitDecision('accept')}
              >
                {t('resolution.accept')}
              </Button>
              <Button
                className="h-12 rounded-[1.25rem]"
                disabled={isSaving || (decisionState === 'modify' && !modifiedValue.trim())}
                type="button"
                variant={decisionState === 'modify' ? 'default' : 'outline'}
                onClick={() => {
                  if (decisionState !== 'modify') {
                    setDecisionState('modify')
                    return
                  }

                  void submitDecision('modify')
                }}
              >
                {t('resolution.modify')}
              </Button>
              <Button
                className="h-12 rounded-[1.25rem]"
                disabled={isSaving}
                type="button"
                variant={decisionState === 'reject' ? 'destructive' : 'outline'}
                onClick={() => void submitDecision('reject')}
              >
                {t('resolution.reject')}
              </Button>
            </div>
          </>
        )}

        {errorMessage ? <p className="app-alert-danger">{errorMessage}</p> : null}
      </CardContent>
    </Card>
  )
}
