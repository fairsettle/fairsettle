'use client'

import { useTranslations } from 'next-intl'

import { ComparisonRow } from '@/components/comparison/ComparisonRow'
import { Card, CardContent } from '@/components/ui/card'
import type { SafeComparisonItem } from '@/lib/comparison'

export function ComparisonTable({
  items,
  viewerRole,
}: {
  items: SafeComparisonItem[]
  viewerRole: 'initiator' | 'responder'
}) {
  const t = useTranslations()

  return (
    <div className="space-y-4">
      <Card className="app-panel shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
        <CardContent className="grid gap-3 p-5 text-sm font-semibold text-ink-soft sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <p>{t('comparison.yourPosition')}</p>
          <p>{t('comparison.theirPosition')}</p>
        </CardContent>
      </Card>

      {items.map((item) => (
        <ComparisonRow
          key={item.question_id}
          disputeType={item.dispute_type}
          guidanceText={item.guidance_text}
          partyAAnswer={viewerRole === 'initiator' ? item.party_a_answer : item.party_b_answer}
          partyBAnswer={viewerRole === 'initiator' ? item.party_b_answer : item.party_a_answer}
          questionText={item.question_text}
          section={item.section}
          status={item.status}
        />
      ))}
    </div>
  )
}
