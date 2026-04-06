'use client'

import { useLocale, useTranslations } from 'next-intl'

import { ComparisonRow } from '@/components/comparison/ComparisonRow'
import { Card, CardContent } from '@/components/ui/card'
import { getLocalizedMessage } from '@/lib/questions'
import type { SafeComparisonItem } from '@/lib/comparison'
import type { ViewerRole } from '@/types/core'

export function ComparisonTable({
  items,
  viewerRole,
}: {
  items: SafeComparisonItem[]
  viewerRole: ViewerRole
}) {
  const locale = useLocale()
  const t = useTranslations()

  if (items.length === 0) {
    return (
      <Card className="app-panel">
        <CardContent className="p-6 text-sm text-ink-soft">
          {t('comparison.emptyBucket')}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="app-panel">
        <CardContent className="grid gap-3 p-5 text-sm font-semibold text-ink-soft sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <p>{t('comparison.yourPosition')}</p>
          <p>{t('comparison.theirPosition')}</p>
        </CardContent>
      </Card>

      {items.map((item) => (
        <ComparisonRow
          key={item.item_key}
          disputeType={item.dispute_type}
          guidanceText={item.guidance_text}
          partyAAnswer={viewerRole === 'initiator' ? item.party_a_answer : item.party_b_answer}
          partyBAnswer={viewerRole === 'initiator' ? item.party_b_answer : item.party_a_answer}
          questionText={
            item.child_label
              ? {
                  en: `${item.child_label}: ${getLocalizedMessage(item.question_text, locale)}`,
                }
              : item.question_text
          }
          section={item.section}
          status={item.status}
        />
      ))}
    </div>
  )
}
