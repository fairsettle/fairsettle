'use client'

import { ShieldCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function NeutralityBanner() {
  const t = useTranslations()

  return (
    <div className="app-panel-brand p-5">
      <div className="flex items-start gap-3">
        <div className="app-icon-chip h-11 w-11 shrink-0 rounded-2xl">
          <ShieldCheck className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-ink">{t('responder.neutralityTitle')}</p>
          <p className="text-sm leading-6 text-ink-soft">{t('responder.neutralityBody')}</p>
        </div>
      </div>
    </div>
  )
}
