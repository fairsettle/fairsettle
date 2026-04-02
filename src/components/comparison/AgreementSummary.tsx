'use client'

import { useTranslations } from 'next-intl'

export function AgreementSummary({
  agreedCount,
  gapCount,
}: {
  agreedCount: number
  gapCount: number
}) {
  const t = useTranslations()

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="inline-flex min-h-20 flex-1 flex-col justify-center rounded-full border border-success/15 bg-success-soft px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-success-foreground">
          {t('comparison.summaryTitle')}
        </p>
        <p className="mt-1 text-3xl font-semibold text-success-foreground">
          {t('comparison.agreed', { n: agreedCount })}
        </p>
      </div>
      <div className="inline-flex min-h-20 flex-1 flex-col justify-center rounded-full border border-danger/15 bg-danger-soft px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-danger">
          {t('comparison.summaryTitle')}
        </p>
        <p className="mt-1 text-3xl font-semibold text-danger">
          {t('comparison.disagreed', { n: gapCount })}
        </p>
      </div>
    </div>
  )
}
