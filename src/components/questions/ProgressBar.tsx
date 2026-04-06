'use client'

import { useTranslations } from 'next-intl'

import { Progress } from '@/components/ui/progress'

export function QuestionProgressBar({
  currentSection,
  totalSections,
  sectionName,
  currentQuestion,
  totalQuestions,
  phaseIndex,
  phaseTotal,
  phaseLabel,
  completedLabel,
}: {
  currentSection: number
  totalSections: number
  sectionName: string
  currentQuestion: number
  totalQuestions: number
  phaseIndex?: number
  phaseTotal?: number
  phaseLabel?: string
  completedLabel?: string
}) {
  const t = useTranslations('questions')
  const progress = totalQuestions === 0 ? 0 : (currentQuestion / totalQuestions) * 100

  return (
    <div className="space-y-3">
      {phaseIndex && phaseTotal ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            {Array.from({ length: phaseTotal }, (_, index) => (
              <span
                key={index}
                className={
                  index + 1 <= phaseIndex
                    ? 'size-2.5 rounded-full bg-brand shadow-[0_0_0_4px_rgba(13,148,136,0.12)]'
                    : 'size-2.5 rounded-full bg-line'
                }
              />
            ))}
          </div>
          <p className="app-kicker">
            {phaseLabel ?? `Phase ${phaseIndex} of ${phaseTotal}`}
          </p>
          {completedLabel ? (
            <p className="text-xs text-ink-soft">{completedLabel}</p>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="app-kicker">
            {t('section', {
              current: currentSection,
              total: totalSections,
              name: sectionName,
            })}
          </p>
        </div>
        <p className="text-sm text-ink-soft">
          {t('questionOf', { current: currentQuestion, total: totalQuestions })}
        </p>
      </div>
      <Progress className="h-2 rounded-full bg-surface-soft" value={progress} />
    </div>
  )
}
