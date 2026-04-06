'use client'

import { Baby, BriefcaseBusiness, Landmark, Layers3, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Card, CardContent } from '@/components/ui/card'
import type { CaseType } from '@/types/core'
import { cn } from '@/lib/utils'

const SELECTABLE_CASE_TYPES = ['child', 'financial', 'asset', 'combined'] as const satisfies readonly CaseType[]

const CASE_TYPE_ICONS: Record<(typeof SELECTABLE_CASE_TYPES)[number], LucideIcon> = {
  child: Baby,
  financial: Landmark,
  asset: BriefcaseBusiness,
  combined: Layers3,
}

type CaseTypeSelectorProps = {
  selection: CaseType[]
  onToggle: (nextType: CaseType) => void
}

export function CaseTypeSelector({ selection, onToggle }: CaseTypeSelectorProps) {
  const t = useTranslations()

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {SELECTABLE_CASE_TYPES.map((caseType) => {
        const Icon = CASE_TYPE_ICONS[caseType]
        const isSelected = selection.includes(caseType)

        return (
          <button key={caseType} type="button" className="text-left" onClick={() => onToggle(caseType)}>
            <Card
              className={cn(
                'h-full rounded-[1.75rem] border-2 transition',
                isSelected
                  ? 'border-brand bg-surface-brand shadow-[0_20px_50px_rgba(13,148,136,0.15)]'
                  : 'border-line bg-surface hover:border-brand/15 hover:bg-surface-soft',
              )}
            >
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-soft text-ink">
                    <Icon className="size-5" />
                  </span>
                  {caseType === 'combined' ? (
                    <span className="app-chip px-3 py-1 text-xs">
                      {t('caseCreator.combinedBadge')}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <h2 className="font-display text-2xl text-ink">{t(`caseTypes.${caseType}`)}</h2>
                  <p className="text-sm leading-6 text-ink-soft">
                    {t(`caseCreator.${caseType}Description`)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </button>
        )
      })}
    </div>
  )
}
