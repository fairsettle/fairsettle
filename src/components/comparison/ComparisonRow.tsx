'use client'

import { useLocale, useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatAnswerValue, getLocalizedMessage } from '@/lib/questions'
import type { SafeComparisonItem } from '@/lib/comparison'

function getAnswerTone(status: SafeComparisonItem['status'], side: 'left' | 'right') {
  if (status === 'agreed') {
    return 'border-success/15 bg-success-soft text-success-foreground'
  }

  return side === 'left'
    ? 'border-brand/15 bg-surface-brand text-ink'
    : 'border-danger/15 bg-danger-soft text-ink'
}

export function ComparisonRow({
  disputeType,
  guidanceText,
  partyAAnswer,
  partyBAnswer,
  questionText,
  section,
  status,
}: {
  disputeType: SafeComparisonItem['dispute_type']
  guidanceText: SafeComparisonItem['guidance_text']
  partyAAnswer: SafeComparisonItem['party_a_answer']
  partyBAnswer: SafeComparisonItem['party_b_answer']
  questionText: SafeComparisonItem['question_text']
  section: string
  status: SafeComparisonItem['status']
}) {
  const locale = useLocale()
  const t = useTranslations()

  return (
    <div className="app-panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-soft/70">{section}</p>
          <h3 className="text-lg font-semibold text-ink">
            {getLocalizedMessage(questionText, locale)}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="border-line bg-surface-soft text-ink" variant="outline">
            {t(`caseTypes.${disputeType}`)}
          </Badge>
          <Badge
            className={cn(
              status === 'agreed'
                ? 'border-success/10 bg-success-soft text-success-foreground'
                : 'border-danger/10 bg-danger-soft text-danger',
            )}
            variant="outline"
          >
            {status === 'agreed' ? t('comparison.agreedLabel') : t('comparison.gap')}
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className={cn('rounded-[1.5rem] border px-4 py-4 text-sm leading-6', getAnswerTone(status, 'left'))}>
          {formatAnswerValue(partyAAnswer)}
        </div>
        <div className={cn('rounded-[1.5rem] border px-4 py-4 text-sm leading-6', getAnswerTone(status, 'right'))}>
          {formatAnswerValue(partyBAnswer)}
        </div>
      </div>

      {status === 'gap' && guidanceText ? (
        <p className="app-note mt-4 bg-surface-soft px-4 py-3">
          {getLocalizedMessage(guidanceText, locale)}
        </p>
      ) : null}
    </div>
  )
}
