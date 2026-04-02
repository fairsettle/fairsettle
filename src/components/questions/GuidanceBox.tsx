'use client'

import { useTranslations } from 'next-intl'

export function GuidanceBox({ body }: { body: string }) {
  const t = useTranslations()

  return (
    <aside className="app-note-warning border-l-4 border-l-warning">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-warning-foreground">
        {t('questions.courtsDecide')}
      </p>
      <p className="mt-3 text-sm leading-6 text-warning-foreground">{body}</p>
    </aside>
  )
}
