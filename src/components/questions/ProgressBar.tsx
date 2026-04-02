'use client'

import { useTranslations } from 'next-intl'

import { Progress } from '@/components/ui/progress'

export function QuestionProgressBar({
  currentSection,
  totalSections,
  sectionName,
  currentQuestion,
  totalQuestions,
}: {
  currentSection: number
  totalSections: number
  sectionName: string
  currentQuestion: number
  totalQuestions: number
}) {
  const t = useTranslations('questions')
  const progress = totalQuestions === 0 ? 0 : (currentQuestion / totalQuestions) * 100

  return (
    <div className="space-y-3">
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
