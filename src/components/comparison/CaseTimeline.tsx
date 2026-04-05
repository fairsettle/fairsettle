'use client'

import { useLocale, useTranslations } from 'next-intl'

import { Card, CardContent } from '@/components/ui/card'

interface TimelineEvent {
  event_type: string
  event_data: Record<string, unknown>
  created_at: string
}

export function CaseTimeline({
  events,
}: {
  events: TimelineEvent[]
}) {
  const locale = useLocale()
  const t = useTranslations()

  return (
    <Card className="app-panel">
      <CardContent className="space-y-4 p-6">
        <div className="space-y-2">
          <h2 className="font-display text-3xl text-ink">{t('timeline.title')}</h2>
          <p className="text-sm leading-6 text-ink-soft">{t('timeline.subtitle')}</p>
        </div>

        {events.length === 0 ? (
          <p className="app-note bg-surface-soft px-4 py-3 text-sm">
            {t('timeline.empty')}
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={`${event.event_type}-${event.created_at}`}
                className="rounded-[1.5rem] border border-line bg-surface px-4 py-4"
              >
                <p className="text-sm font-semibold text-ink">
                  {t(`timeline.events.${event.event_type}`)}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {new Date(event.created_at).toLocaleString(locale)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
