import { Resend } from 'resend'

import { buildAppUrl } from '@/lib/app-url'
import { getMessage, loadMessages } from '@/lib/messages'

const resend = new Resend(process.env.RESEND_API_KEY)
export { resend }

export type EmailTemplate =
  | 'invitation'
  | 'reminder_48h'
  | 'reminder_7d'
  | 'reminder_14d'
  | 'responder_accepted'
  | 'responder_completed'
  | 'export_ready'
  | 'single_party_export'

function buildUnsubscribeUrl() {
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@fairsettle.co.uk'

  return `mailto:${fromEmail}?subject=FairSettle%20unsubscribe`
}

function getSender() {
  const fromEmail = process.env.RESEND_FROM_EMAIL
  const fromName = process.env.RESEND_FROM_NAME ?? 'FairSettle'

  if (!fromEmail) {
    throw new Error('RESEND_FROM_EMAIL is not configured')
  }

  return `${fromName} <${fromEmail}>`
}

function buildEmailHtml({
  title,
  body,
  ctaLabel,
  ctaUrl,
  footer,
  unsubscribeLabel,
  unsubscribeUrl,
}: {
  title: string
  body: string
  ctaLabel: string
  ctaUrl: string
  footer: string
  unsubscribeLabel: string
  unsubscribeUrl: string
}) {
  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${title} — FairSettle
    </div>
    <div style="background:#f4f8f7;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid #deebe7;box-shadow:0 18px 48px rgba(15,23,42,0.06);">
        <div style="margin-bottom:20px;">
          <div style="font-size:32px;line-height:1;font-weight:700;letter-spacing:-0.03em;color:#0f766e;">FairSettle</div>
          <div style="margin-top:8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#7b8aa0;">fairsettle.co.uk</div>
        </div>
        <h1 style="font-size:28px;line-height:1.1;margin:0 0 12px;color:#1b2b4b;">${title}</h1>
        <p style="font-size:16px;line-height:1.7;color:#475569;margin:0 0 24px;">${body}</p>
        <a href="${ctaUrl}" style="display:inline-block;background:#0f9488;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:999px;font-weight:700;">
          ${ctaLabel}
        </a>
        <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;">
          <p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:#64748b;">${footer}</p>
          <p style="margin:0 0 12px;font-size:13px;line-height:1.7;color:#64748b;">FairSettle, fairsettle.co.uk</p>
          <a href="${unsubscribeUrl}" style="font-size:13px;color:#0f766e;text-decoration:underline;">
            ${unsubscribeLabel}
          </a>
        </div>
      </div>
    </div>
  `
}

function buildEmailText({
  title,
  body,
  ctaLabel,
  ctaUrl,
  footer,
  unsubscribeLabel,
  unsubscribeUrl,
}: {
  title: string
  body: string
  ctaLabel: string
  ctaUrl: string
  footer: string
  unsubscribeLabel: string
  unsubscribeUrl: string
}) {
  return [title, '', body, '', `${ctaLabel}: ${ctaUrl}`, '', footer, unsubscribeLabel, unsubscribeUrl].join('\n')
}

export async function sendEmail(
  to: string,
  template: EmailTemplate,
  data: Record<string, string>,
  locale: string = 'en',
  tags?: Record<string, string>,
): Promise<string> {
  const messages = await loadMessages(locale)
  const unsubscribeUrl = buildUnsubscribeUrl()

  const templateMap: Record<
    EmailTemplate,
    {
      subject: string
      title: string
      body: string
      cta: string
      ctaUrl: string
    }
  > = {
    invitation: {
      subject: getMessage(messages, 'email.invitation.subject', data),
      title: getMessage(messages, 'email.invitation.title', data),
      body: getMessage(messages, 'email.invitation.body', data),
      cta: getMessage(messages, 'email.invitation.cta', data),
      ctaUrl: data.inviteUrl,
    },
    reminder_48h: {
      subject: getMessage(messages, 'email.reminders.first.subject', data),
      title: getMessage(messages, 'email.reminders.first.title', data),
      body: getMessage(messages, 'email.reminders.first.body', data),
      cta: getMessage(messages, 'email.reminders.first.cta', data),
      ctaUrl: data.inviteUrl,
    },
    reminder_7d: {
      subject: getMessage(messages, 'email.reminders.second.subject', data),
      title: getMessage(messages, 'email.reminders.second.title', data),
      body: getMessage(messages, 'email.reminders.second.body', data),
      cta: getMessage(messages, 'email.reminders.second.cta', data),
      ctaUrl: data.inviteUrl,
    },
    reminder_14d: {
      subject: getMessage(messages, 'email.reminders.final.subject', data),
      title: getMessage(messages, 'email.reminders.final.title', data),
      body: getMessage(messages, 'email.reminders.final.body', data),
      cta: getMessage(messages, 'email.reminders.final.cta', data),
      ctaUrl: data.inviteUrl,
    },
    responder_accepted: {
      subject: getMessage(messages, 'email.accepted.subject', data),
      title: getMessage(messages, 'email.accepted.title', data),
      body: getMessage(messages, 'email.accepted.body', data),
      cta: getMessage(messages, 'email.accepted.cta', data),
      ctaUrl: data.caseUrl,
    },
    responder_completed: {
      subject: getMessage(messages, 'email.responderCompleted.subject', data),
      title: getMessage(messages, 'email.responderCompleted.title', data),
      body: getMessage(messages, 'email.responderCompleted.body', data),
      cta: getMessage(messages, 'email.responderCompleted.cta', data),
      ctaUrl: data.caseUrl,
    },
    export_ready: {
      subject: getMessage(messages, 'email.exportReady.subject', data),
      title: getMessage(messages, 'email.exportReady.title', data),
      body: getMessage(messages, 'email.exportReady.body', data),
      cta: getMessage(messages, 'email.exportReady.cta', data),
      ctaUrl: data.caseUrl,
    },
    single_party_export: {
      subject: getMessage(messages, 'email.singleParty.subject', data),
      title: getMessage(messages, 'email.singleParty.title', data),
      body: getMessage(messages, 'email.singleParty.body', data),
      cta: getMessage(messages, 'email.singleParty.cta', data),
      ctaUrl: data.caseUrl,
    },
  }

  const selected = templateMap[template]
  const footer = getMessage(messages, 'email.footer.notice')
  const unsubscribeLabel = getMessage(messages, 'email.footer.unsubscribe')

  const result = await resend.emails.send({
    from: getSender(),
    to,
    subject: selected.subject,
    tags: tags
      ? Object.entries(tags).map(([name, value]) => ({
          name,
          value,
        }))
      : undefined,
    html: buildEmailHtml({
      title: selected.title,
      body: selected.body,
      ctaLabel: selected.cta,
      ctaUrl: selected.ctaUrl,
      footer,
      unsubscribeLabel,
      unsubscribeUrl,
    }),
    text: buildEmailText({
      title: selected.title,
      body: selected.body,
      ctaLabel: selected.cta,
      ctaUrl: selected.ctaUrl,
      footer,
      unsubscribeLabel,
      unsubscribeUrl,
    }),
  })

  if (result.error) {
    throw new Error(result.error.message ?? 'Unable to send email')
  }

  if (!result.data?.id) {
    throw new Error('Resend did not return an email id')
  }

  return result.data.id
}

export async function sendInvitationEmail(
  recipientEmail: string,
  invitationToken: string,
  _initiatorName: string,
  locale: string = 'en',
  options?: {
    origin?: string
    invitationId?: string
    caseId?: string
  },
): Promise<string> {
  return await sendEmail(
    recipientEmail,
    'invitation',
    {
      inviteUrl: buildAppUrl(`/respond/${invitationToken}`, locale, options?.origin),
    },
    locale,
    options?.invitationId
      ? {
          invitation_id: options.invitationId,
          ...(options.caseId ? { case_id: options.caseId } : {}),
          email_template: 'invitation',
        }
      : undefined,
  )
}

export async function sendReminderEmail(
  recipientEmail: string,
  invitationToken: string,
  reminderNumber: 1 | 2 | 3,
  daysRemaining: number,
  locale: string = 'en',
): Promise<void> {
  const template: EmailTemplate =
    reminderNumber === 1 ? 'reminder_48h' : reminderNumber === 2 ? 'reminder_7d' : 'reminder_14d'

  await sendEmail(
    recipientEmail,
    template,
    {
      inviteUrl: buildAppUrl(`/respond/${invitationToken}`, locale),
      daysRemaining: String(daysRemaining),
    },
    locale,
  )
}

export async function sendResponderAcceptedEmail(
  initiatorEmail: string,
  caseId: string,
  locale: string = 'en',
  origin?: string,
): Promise<void> {
  await sendEmail(
    initiatorEmail,
    'responder_accepted',
    {
      caseUrl: buildAppUrl(`/cases/${caseId}/questions`, locale, origin),
    },
    locale,
  )
}

export async function sendResponderCompletedEmail(
  initiatorEmail: string,
  caseId: string,
  locale: string = 'en',
  origin?: string,
): Promise<void> {
  await sendEmail(
    initiatorEmail,
    'responder_completed',
    {
      caseUrl: buildAppUrl(`/cases/${caseId}/comparison`, locale, origin),
    },
    locale,
  )
}

export async function sendExportReadyEmail(
  userEmail: string,
  caseId: string,
  tier: 'standard' | 'resolution',
  locale: string = 'en',
): Promise<void> {
  await sendEmail(
    userEmail,
    'export_ready',
    {
      caseUrl: buildAppUrl(`/cases/${caseId}/export`, locale),
      tier,
    },
    locale,
  )
}

export async function sendSinglePartyExportReadyEmail(
  initiatorEmail: string,
  caseId: string,
  locale: string = 'en',
): Promise<void> {
  await sendEmail(
    initiatorEmail,
    'single_party_export',
    {
      caseUrl: buildAppUrl(`/cases/${caseId}/export`, locale),
    },
    locale,
  )
}
