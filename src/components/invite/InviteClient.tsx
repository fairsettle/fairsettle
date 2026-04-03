'use client'

import { CheckCircle2, Mail, RotateCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { SavingsBar } from '@/components/savings/SavingsBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type InviteItem = {
  id: string
  recipient_contact: string
  method: 'email' | 'sms' | 'whatsapp'
  status: 'sent' | 'opened' | 'accepted' | 'expired'
  resend_email_id: string | null
  delivery_status: 'queued' | 'delivered' | 'delivery_delayed' | 'bounced' | 'complained' | 'failed'
  delivery_last_event_at: string | null
  delivery_last_event_type: string | null
  delivery_error: string | null
  sent_at: string
  opened_at: string | null
  accepted_at: string | null
  expires_at: string
  reminder_count: number
  last_reminder_at: string | null
}

function getDeliveryStatusClasses(status: InviteItem['delivery_status']) {
  switch (status) {
    case 'delivered':
      return 'border-success/10 bg-success-soft text-success'
    case 'delivery_delayed':
      return 'border-warning/10 bg-warning-soft text-warning'
    case 'bounced':
    case 'complained':
    case 'failed':
      return 'border-danger/10 bg-danger-soft text-danger'
    case 'queued':
    default:
      return 'border-brand/10 bg-brand-soft text-brand-strong'
  }
}

function getInviteStatusClasses(status: InviteItem['status']) {
  switch (status) {
    case 'accepted':
      return 'border-success/10 bg-success-soft text-success'
    case 'opened':
      return 'border-brand/10 bg-brand-soft text-brand-strong'
    case 'expired':
      return 'border-danger/10 bg-danger-soft text-danger'
    case 'sent':
    default:
      return 'border-warning/10 bg-warning-soft text-warning'
  }
}

export function InviteClient({ caseId }: { caseId: string }) {
  const locale = useLocale()
  const t = useTranslations()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingInvites, setIsLoadingInvites] = useState(true)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [invitations, setInvitations] = useState<InviteItem[]>([])

  const formatDate = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : locale, {
        dateStyle: 'medium',
      }),
    [locale],
  )

  const inviteCounts = useMemo(
    () => ({
      sent: invitations.filter((item) => item.status === 'sent').length,
      opened: invitations.filter((item) => item.status === 'opened').length,
      accepted: invitations.filter((item) => item.status === 'accepted').length,
    }),
    [invitations],
  )

  const loadInvitations = useCallback(async () => {
    setIsLoadingInvites(true)

    try {
      const response = await fetch(`/api/invitations?case_id=${encodeURIComponent(caseId)}`)
      const payload = (await response.json().catch(() => null)) as
        | { invitations?: InviteItem[]; error?: string }
        | null

      if (!response.ok) {
        setErrorMessage(payload?.error ?? t('errors.generic'))
        setInvitations([])
        return
      }

      setInvitations(payload?.invitations ?? [])
    } catch {
      setErrorMessage(t('errors.generic'))
      setInvitations([])
    } finally {
      setIsLoadingInvites(false)
    }
  }, [caseId, t])

  useEffect(() => {
    void loadInvitations()
  }, [loadInvitations])

  async function createInvitation({
    recipientContact,
    resendInvitationId,
  }: {
    recipientContact: string
    resendInvitationId?: string
  }) {
    setErrorMessage('')
    setSuccessMessage('')

    if (resendInvitationId) {
      setResendingId(resendInvitationId)
    } else {
      setIsSubmitting(true)
    }

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          case_id: caseId,
          recipient_contact: recipientContact,
          resend_invitation_id: resendInvitationId,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        const error = payload?.error?.toLowerCase() ?? ''

        setErrorMessage(
          error.includes('you cannot invite yourself')
            ? t('invite.selfInvite')
            : error.includes('active invitation already exists')
              ? t('invite.duplicateActive')
              : payload?.error ?? t('errors.generic'),
        )
        return
      }

      setSuccessMessage(t('invite.sentTo', { email: recipientContact }))
      setEmail('')
      await loadInvitations()
    } catch {
      setErrorMessage(t('errors.generic'))
    } finally {
      setIsSubmitting(false)
      setResendingId(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await createInvitation({ recipientContact: email })
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

            {successMessage ? (
              <p className="app-alert-success">{successMessage}</p>
            ) : null}

            {errorMessage ? <p className="app-alert-danger">{errorMessage}</p> : null}

            <Button className="h-12 w-full text-base" disabled={isSubmitting || !email} size="lg" type="submit">
              {isSubmitting ? t('invite.resending') : t('invite.send')}
            </Button>
          </CardContent>
        </Card>
      </form>

      <Card className="app-panel-soft">
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <h3 className="font-display text-2xl text-ink">{t('invite.historyTitle')}</h3>
            <p className="app-copy">{t('invite.statusTracking')}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="app-note-brand">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-soft/70">{t('invite.pendingCount')}</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{inviteCounts.sent}</p>
            </div>
            <div className="app-note-brand">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-soft/70">{t('invite.openedCount')}</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{inviteCounts.opened}</p>
            </div>
            <div className="app-note-brand">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-soft/70">{t('invite.acceptedCount')}</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{inviteCounts.accepted}</p>
            </div>
          </div>

          {isLoadingInvites ? (
            <p className="app-copy">{t('dashboard.loading')}</p>
          ) : invitations.length === 0 ? (
            <div className="app-note">
              <p className="font-medium text-ink">{t('invite.noInvitesYet')}</p>
              <p className="mt-2">{t('invite.noInvitesYetBody')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => {
                const detailLine =
                  invitation.status === 'accepted' && invitation.accepted_at
                    ? t('invite.acceptedOn', { date: formatDate.format(new Date(invitation.accepted_at)) })
                    : invitation.status === 'opened' && invitation.opened_at
                      ? t('invite.openedOn', { date: formatDate.format(new Date(invitation.opened_at)) })
                      : t('invite.awaitingResponse')

                const deliveryLine =
                  invitation.delivery_status === 'delivered' && invitation.delivery_last_event_at
                    ? t('invite.deliveryDeliveredOn', {
                        date: formatDate.format(new Date(invitation.delivery_last_event_at)),
                      })
                    : invitation.delivery_status === 'delivery_delayed'
                      ? t('invite.deliveryDelayed')
                      : invitation.delivery_status === 'bounced'
                        ? invitation.delivery_error || t('invite.deliveryBounced')
                        : invitation.delivery_status === 'complained'
                          ? t('invite.deliveryComplained')
                          : invitation.delivery_status === 'failed'
                            ? invitation.delivery_error || t('invite.deliveryFailed')
                            : t('invite.deliveryQueued')

                return (
                  <div
                    key={invitation.id}
                    className="rounded-[1.5rem] border border-line/80 bg-surface/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-ink">{invitation.recipient_contact}</p>
                        <p className="text-sm text-ink-soft">{detailLine}</p>
                        <p className="text-sm text-ink-soft">{deliveryLine}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={cn('h-8 border px-3 text-sm font-semibold', getInviteStatusClasses(invitation.status))}
                          variant="outline"
                        >
                          {t(`inviteStatus.${invitation.status}`)}
                        </Badge>
                        <Badge
                          className={cn(
                            'h-8 border px-3 text-sm font-semibold',
                            getDeliveryStatusClasses(invitation.delivery_status),
                          )}
                          variant="outline"
                        >
                          {t(`inviteDelivery.${invitation.delivery_status}`)}
                        </Badge>
                        {invitation.status !== 'accepted' && invitation.status !== 'expired' ? (
                          <Button
                            className="h-10 px-4"
                            disabled={resendingId === invitation.id}
                            onClick={() =>
                              void createInvitation({
                                recipientContact: invitation.recipient_contact,
                                resendInvitationId: invitation.id,
                              })
                            }
                            type="button"
                            variant="outline"
                          >
                            <RotateCw className="mr-2 size-4" />
                            {resendingId === invitation.id ? t('invite.resending') : t('invite.resend')}
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-line/80 pt-4 text-sm sm:grid-cols-3">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-soft/70">{t('invite.sentLabel')}</p>
                        <p className="font-medium text-ink">
                          {formatDate.format(new Date(invitation.sent_at))}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-soft/70">{t('invite.remindersSent')}</p>
                        <p className="font-medium text-ink">{invitation.reminder_count}</p>
                      </div>
                      <div className="space-y-1 sm:text-right">
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-soft/70">
                          {invitation.last_reminder_at ? t('invite.lastReminder') : t('invite.expiresLabel')}
                        </p>
                        <p className="font-medium text-ink">
                          {invitation.last_reminder_at
                            ? formatDate.format(new Date(invitation.last_reminder_at))
                            : formatDate.format(new Date(invitation.expires_at))}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <SavingsBar stage={2} />
    </div>
  )
}
