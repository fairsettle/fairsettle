'use client'

import { Baby, BriefcaseBusiness, ArrowRight, Landmark, Layers3 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { SavingsBar } from '@/components/savings/SavingsBar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { fetchApi } from '@/lib/api-client'
import { readApiErrorMessage, resolveApiErrorMessage } from '@/lib/client-errors'
import { getLocalizedPath } from '@/lib/locale-path'
import { cn } from '@/lib/utils'

type SelectableCaseType = 'child' | 'financial' | 'asset' | 'combined'

const CASE_ICONS = {
  child: Baby,
  financial: Landmark,
  asset: BriefcaseBusiness,
  combined: Layers3,
} as const

export default function NewCasePage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations()
  const [selection, setSelection] = useState<SelectableCaseType[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const cards: SelectableCaseType[] = ['child', 'financial', 'asset', 'combined']

  function toggleSelection(nextType: SelectableCaseType) {
    if (nextType === 'combined') {
      setSelection((current) => (current.includes('combined') ? [] : ['combined']))
      return
    }

    setSelection((current) => {
      const withoutCombined = current.filter((item) => item !== 'combined')

      if (withoutCombined.includes(nextType)) {
        return withoutCombined.filter((item) => item !== nextType)
      }

      return [...withoutCombined, nextType]
    })
  }

  function getCaseTypeToCreate(): SelectableCaseType | null {
    if (selection.length === 0) {
      return null
    }

    if (selection.includes('combined') || selection.length > 1) {
      return 'combined'
    }

    return selection[0] ?? null
  }

  async function handleContinue() {
    const caseType = getCaseTypeToCreate()

    if (!caseType) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const response = await fetchApi('/api/cases', locale, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ case_type: caseType }),
      })

      const data = (await response.json().catch(() => null)) as {
        case?: { id?: string }
        error?: string
        redirect_to?: string | null
      } | null

      const nextCaseId = data?.case?.id

      if (response.status === 409 && data?.redirect_to) {
        router.push(
          getLocalizedPath(
            locale,
            `${data.redirect_to}?redirect=${encodeURIComponent(`/cases/new`)}`,
          ),
        )
        return
      }

      if (!response.ok || !nextCaseId) {
        setErrorMessage(
          resolveApiErrorMessage(
            data?.error ?? (response.ok ? null : await readApiErrorMessage(response)),
            t('caseCreator.createError'),
          ),
        )
        return
      }

      router.push(getLocalizedPath(locale, `/cases/${nextCaseId}/questions`))
    } catch {
      setErrorMessage(t('caseCreator.createError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell px-5 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          brandLabel={t('nav.brand')}
          eyebrow={t('caseCreator.title')}
          icon={Layers3}
          locale={locale}
          subtitle={t('caseCreator.subtitle')}
          title={t('caseCreator.heading')}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {cards.map((card) => {
            const Icon = CASE_ICONS[card]
            const isSelected = selection.includes(card)

            return (
              <button key={card} type="button" className="text-left" onClick={() => toggleSelection(card)}>
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
                      {card === 'combined' ? (
                        <span className="app-chip px-3 py-1 text-xs">
                          {t('caseCreator.combinedBadge')}
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <h2 className="font-display text-2xl text-ink">{t(`caseTypes.${card}`)}</h2>
                      <p className="text-sm leading-6 text-ink-soft">
                        {t(`caseCreator.${card}Description`)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            )
          })}
        </div>

        {errorMessage ? <p className="app-alert-danger">{errorMessage}</p> : null}

        <div className="space-y-4">
          <SavingsBar stage={0} />
          <Button
            className="h-12 w-full text-base"
            disabled={selection.length === 0 || isSubmitting}
            size="lg"
            type="button"
            onClick={handleContinue}
          >
            {t('caseCreator.continue')}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    </main>
  )
}
