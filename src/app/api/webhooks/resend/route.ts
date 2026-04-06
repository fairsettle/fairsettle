import { NextResponse } from 'next/server'
import type { WebhookEventPayload } from 'resend'

import { apiError } from '@/lib/api-errors'
import { resend } from '@/lib/email/resend'
import { supabaseAdmin } from '@/lib/supabase/admin'

type DeliveryStatus = 'queued' | 'delivered' | 'delivery_delayed' | 'bounced' | 'complained' | 'failed'
type EmailWebhookEvent = Extract<WebhookEventPayload, { type: `email.${string}` }>

function getWebhookHeaders(req: Request) {
  const id = req.headers.get('svix-id')
  const timestamp = req.headers.get('svix-timestamp')
  const signature = req.headers.get('svix-signature')

  if (!id || !timestamp || !signature) {
    return null
  }

  return { id, timestamp, signature }
}

function getDeliveryUpdate(event: WebhookEventPayload): {
  delivery_status: DeliveryStatus
  delivery_error: string | null
} | null {
  switch (event.type) {
    case 'email.sent':
    case 'email.scheduled':
      return { delivery_status: 'queued', delivery_error: null }
    case 'email.delivered':
    case 'email.opened':
    case 'email.clicked':
      return { delivery_status: 'delivered', delivery_error: null }
    case 'email.delivery_delayed':
      return { delivery_status: 'delivery_delayed', delivery_error: null }
    case 'email.bounced':
      return {
        delivery_status: 'bounced',
        delivery_error: event.data.bounce.message ?? 'The recipient mail server rejected the message.',
      }
    case 'email.complained':
      return {
        delivery_status: 'complained',
        delivery_error: 'The recipient marked this message as spam.',
      }
    case 'email.failed':
      return {
        delivery_status: 'failed',
        delivery_error: event.data.failed.reason ?? 'The email failed before delivery.',
      }
    case 'email.suppressed':
      return {
        delivery_status: 'failed',
        delivery_error: event.data.suppressed.message ?? 'The email was suppressed by the provider.',
      }
    default:
      return null
  }
}

function isEmailWebhookEvent(event: WebhookEventPayload): event is EmailWebhookEvent {
  return event.type.startsWith('email.') && 'email_id' in event.data
}

export async function POST(req: Request) {
  if (!process.env.RESEND_WEBHOOK_SECRET) {
    return apiError(req, 'INTERNAL_ERROR', 500)
  }

  const headers = getWebhookHeaders(req)

  if (!headers) {
    return apiError(req, 'SIGNATURE_MISSING', 400)
  }

  const payload = await req.text()

  let event: WebhookEventPayload

  try {
    event = resend.webhooks.verify({
      payload,
      headers,
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    })
  } catch {
    return apiError(req, 'SIGNATURE_INVALID', 400)
  }

  if (!isEmailWebhookEvent(event)) {
    return NextResponse.json({ received: true })
  }

  if (!('tags' in event.data)) {
    return NextResponse.json({ received: true })
  }

  const invitationId = event.data.tags?.invitation_id
  const deliveryUpdate = getDeliveryUpdate(event)

  if (!invitationId || !deliveryUpdate) {
    return NextResponse.json({ received: true })
  }

  const { data: invitation } = await supabaseAdmin
    .from('invitations')
    .select('id, resend_email_id, delivery_status')
    .eq('id', invitationId)
    .maybeSingle()

  if (!invitation) {
    return NextResponse.json({ received: true })
  }

  if (invitation.resend_email_id && invitation.resend_email_id !== event.data.email_id) {
    return NextResponse.json({ received: true })
  }

  await supabaseAdmin
    .from('invitations')
    .update({
      resend_email_id: event.data.email_id,
      delivery_status: deliveryUpdate.delivery_status,
      delivery_last_event_at: event.created_at,
      delivery_last_event_type: event.type,
      delivery_error: deliveryUpdate.delivery_error,
    })
    .eq('id', invitationId)

  return NextResponse.json({ received: true })
}
