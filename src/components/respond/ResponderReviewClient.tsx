'use client'

import { Check, CircleDashed, MoveRight, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'

import { SavingsBar } from '@/components/savings/SavingsBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { fetchApi } from '@/lib/api-client'
import { readApiErrorMessage, resolveApiErrorMessage } from '@/lib/client-errors'
import { getLocalizedPath } from '@/lib/locale-path'

type ReviewAction = 'agree' | 'disagree' | 'counter'

type ReviewItem = {
  question_id: string
  dispute_type: 'child' | 'financial' | 'asset'
  question_label: string
  answer_summary: string
}

type SavedReview = {
  question_id: string
  action: ReviewAction
  counter_text?: string
}

function getBadgeClassName(disputeType: ReviewItem['dispute_type']) {
  if (disputeType === 'child') {
    return 'border-brand/10 bg-brand-soft text-brand-strong'
  }

  if (disputeType === 'financial') {
    return 'border-warning/10 bg-warning-soft text-warning-foreground'
  }

  return 'border-line bg-surface-soft text-ink'
}

function getActionClassName(action: ReviewAction, isSelected: boolean) {
  if (!isSelected) {
    return 'border-line bg-surface text-ink-soft hover:border-brand/15 hover:text-ink'
  }

  if (action === 'agree') {
    return 'border-success/20 bg-success-soft text-success-foreground'
  }

  if (action === 'disagree') {
    return 'border-danger/20 bg-danger-soft text-danger'
  }

  return 'border-warning/20 bg-warning-soft text-warning-foreground'
}

export function ResponderReviewClient({
  caseId,
  invitationToken,
  items,
  initialSelections,
}: {
  caseId: string
  invitationToken: string
  items: ReviewItem[]
  initialSelections: SavedReview[]
}) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selections, setSelections] = useState<Record<string, SavedReview>>(
    Object.fromEntries(initialSelections.map((item) => [item.question_id, item])),
  )

  const allItemsAnswered = useMemo(
    () =>
      items.every((item) => {
        const selection = selections[item.question_id]

        if (!selection) {
          return false
        }

        if (selection.action !== 'counter') {
          return true
        }

        return Boolean(selection.counter_text?.trim())
      }),
    [items, selections],
  )

  function updateSelection(questionId: string, action: ReviewAction) {
    setSelections((current) => ({
      ...current,
      [questionId]: {
        question_id: questionId,
        action,
        counter_text: action === 'counter' ? current[questionId]?.counter_text ?? '' : undefined,
      },
    }))
  }

  function updateCounter(questionId: string, counterText: string) {
    setSelections((current) => ({
      ...current,
      [questionId]: {
        question_id: questionId,
        action: 'counter',
        counter_text: counterText,
      },
    }))
  }

  async function handleSubmit() {
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetchApi(`/api/invitations/${invitationToken}/review`, locale, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map((item) => selections[item.question_id]),
        }),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        setErrorMessage(
          resolveApiErrorMessage(
            payload?.error ?? (await readApiErrorMessage(response)),
            t('errors.generic'),
          ),
        )
        return
      }

      router.push(getLocalizedPath(locale, `/cases/${caseId}/questions`))
      router.refresh()
    } catch {
      setErrorMessage(t('errors.generic'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="app-panel">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <p className="app-kicker">{t('responder.reviewEyebrow')}</p>
            <h2 className="font-display text-3xl text-ink">{t('responder.reviewTitle')}</h2>
            <p className="text-sm leading-6 text-ink-soft">{t('responder.reviewBody')}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {items.map((item) => {
          const selection = selections[item.question_id]

          return (
            <Card key={item.question_id} className="app-panel">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-3">
                  <Badge className={getBadgeClassName(item.dispute_type)} variant="outline">
                    {t(`caseTypes.${item.dispute_type}`)}
                  </Badge>
                  <h3 className="text-lg font-semibold text-ink">{item.question_label}</h3>
                  <p className="app-note bg-surface-soft px-4 py-3">
                    {item.answer_summary || t('questionsFlow.noAnswer')}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <Button
                    className={`h-12 rounded-[1.25rem] border ${getActionClassName('agree', selection?.action === 'agree')}`}
                    type="button"
                    variant="outline"
                    onClick={() => updateSelection(item.question_id, 'agree')}
                  >
                    <Check className="mr-2 size-4" />
                    {t('responder.agree')}
                  </Button>
                  <Button
                    className={`h-12 rounded-[1.25rem] border ${getActionClassName('disagree', selection?.action === 'disagree')}`}
                    type="button"
                    variant="outline"
                    onClick={() => updateSelection(item.question_id, 'disagree')}
                  >
                    <X className="mr-2 size-4" />
                    {t('responder.disagree')}
                  </Button>
                  <Button
                    className={`h-12 rounded-[1.25rem] border ${getActionClassName('counter', selection?.action === 'counter')}`}
                    type="button"
                    variant="outline"
                    onClick={() => updateSelection(item.question_id, 'counter')}
                  >
                    <CircleDashed className="mr-2 size-4" />
                    {t('responder.counter')}
                  </Button>
                </div>

                {selection?.action === 'counter' ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink" htmlFor={`counter-${item.question_id}`}>
                      {t('responder.counterLabel')}
                    </label>
                    <Textarea
                      id={`counter-${item.question_id}`}
                      maxLength={500}
                      placeholder={t('responder.counterPlaceholder')}
                      rows={4}
                      value={selection.counter_text ?? ''}
                      onChange={(event) => updateCounter(item.question_id, event.target.value)}
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {errorMessage ? <p className="app-alert-danger">{errorMessage}</p> : null}

      <div className="space-y-4">
        <Button
          className="h-12 w-full text-base"
          disabled={isSubmitting || !allItemsAnswered}
          size="lg"
          type="button"
          onClick={handleSubmit}
        >
          {t('responder.submit')}
          <MoveRight className="ml-2 size-4" />
        </Button>
        <SavingsBar stage={2} />
      </div>
    </div>
  )
}
