'use client'

import { CheckCircle2, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { SavingsBar } from '@/components/savings/SavingsBar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getLocalizedPath } from '@/lib/locale-path'

export function InviteClient({ caseId }: { caseId: string }) {
  const locale = useLocale()
  const t = useTranslations()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSent, setIsSent] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          case_id: caseId,
          recipient_contact: email,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        setErrorMessage(payload?.error ?? t('errors.generic'))
        return
      }

      setIsSent(true)
    } catch {
      setErrorMessage(t('errors.generic'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSent) {
    return (
      <div className="space-y-6">
        <Card className="app-panel">
          <CardContent className="space-y-5 p-6">
            <div className="app-icon-chip">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-3xl text-ink">{t('invite.sentTitle')}</h2>
              <p className="app-copy">{t('invite.sentBody')}</p>
            </div>
            <div className="app-note-brand">
              <p className="font-medium text-ink">{t('invite.ifNoResponse')}</p>
              <p className="mt-2">{t('invite.reminderSchedule')}</p>
            </div>
            <Button asChild className="h-12 w-full text-base" size="lg">
              <a href={getLocalizedPath(locale, '/dashboard')}>{t('invite.sentCta')}</a>
            </Button>
          </CardContent>
        </Card>

        <SavingsBar stage={2} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card className="app-panel">
          <CardContent className="space-y-5 p-6">
            <div className="app-chip h-12 w-12 justify-center rounded-2xl px-0">
              <Mail className="size-5" />
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-3xl text-ink">{t('invite.title')}</h2>
              <p className="max-w-2xl text-sm leading-6 text-ink-soft">{t('invite.subtitle')}</p>
            </div>

            <div className="app-chip h-11">
              <Mail className="size-4 text-brand" />
              <span>{t('invite.viaEmail')}</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink" htmlFor="invite-email">
                {t('invite.emailLabel')}
              </label>
              <Input
                id="invite-email"
                placeholder={t('invite.emailPlaceholder')}
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="app-note-brand">
              <p className="font-medium text-ink">{t('invite.previewTitle')}</p>
              <p className="mt-2">{t('invite.previewBody')}</p>
            </div>

            <div className="app-note">
              <p className="font-medium text-ink">{t('invite.ifNoResponse')}</p>
              <p className="mt-2">{t('invite.reminderSchedule')}</p>
            </div>

            {errorMessage ? <p className="app-alert-danger">{errorMessage}</p> : null}

            <Button className="h-12 w-full text-base" disabled={isSubmitting || !email} size="lg" type="submit">
              {t('invite.send')}
            </Button>
          </CardContent>
        </Card>
      </form>

      <SavingsBar stage={2} />
    </div>
  )
}
