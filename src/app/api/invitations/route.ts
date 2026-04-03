import { NextResponse } from 'next/server'
import { z } from 'zod'

import { sendInvitationEmail } from '@/lib/email/resend'
import { generateInvitationToken } from '@/lib/invitations'
import { getRequestOrigin } from '@/lib/app-url'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/timeline'

const invitationSchema = z.object({
  case_id: z.string().uuid(),
  recipient_contact: z.string().email(),
  resend_invitation_id: z.string().uuid().optional(),
})

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

async function getAuthorizedContext(caseId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { supabase, user: null, caseItem: null, profile: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: caseItem, error: caseError } = await supabase
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .single()

  if (caseError || !caseItem) {
    return { supabase, user, caseItem: null, profile: null, response: NextResponse.json({ error: 'Case not found' }, { status: 404 }) }
  }

  if (caseItem.initiator_id !== user.id) {
    return { supabase, user, caseItem, profile: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { supabase, user, caseItem, profile, response: null }
}

async function createAndSendInvitation({
  supabase,
  caseId,
  initiatorId,
  recipientContact,
  origin,
  preferredLanguage,
  previousInvitationId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  caseId: string
  initiatorId: string
  recipientContact: string
  origin: string
  preferredLanguage: string
  previousInvitationId?: string
}) {
  const token = generateInvitationToken()
  const expiresAt = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()

  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .insert({
      case_id: caseId,
      method: 'email',
      recipient_contact: recipientContact,
      token,
      expires_at: expiresAt,
    })
    .select('*')
    .single()

  if (invitationError || !invitation) {
    return {
      response: NextResponse.json(
        { error: invitationError?.message ?? 'Unable to create invitation' },
        { status: 400 },
      ),
    }
  }

  try {
    const resendEmailId = await sendInvitationEmail(
      recipientContact,
      token,
      '',
      preferredLanguage || 'en',
      {
        origin,
        invitationId: invitation.id,
        caseId,
      },
    )

    await supabase
      .from('invitations')
      .update({
        resend_email_id: resendEmailId,
        delivery_status: 'queued',
        delivery_error: null,
      })
      .eq('id', invitation.id)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unable to send invitation'

    await supabase
      .from('invitations')
      .update({
        delivery_status: 'failed',
        delivery_error: errorMessage,
        delivery_last_event_at: new Date().toISOString(),
        delivery_last_event_type: 'email.failed',
      })
      .eq('id', invitation.id)

    return {
      response: NextResponse.json(
        { error: errorMessage, invitation_id: invitation.id },
        { status: 500 },
      ),
    }
  }

  if (previousInvitationId) {
    await supabase
      .from('invitations')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', previousInvitationId)
  }

  await supabase.from('cases').update({ status: 'invited' }).eq('id', caseId)
  await logEvent(caseId, 'invitation_sent', initiatorId, {
    invitation_id: invitation.id,
    resent_from_invitation_id: previousInvitationId ?? null,
  })

  return {
    response: NextResponse.json({
      invitation_id: invitation.id,
      expires_at: expiresAt,
    }),
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const caseId = url.searchParams.get('case_id')

  if (!caseId) {
    return NextResponse.json({ error: 'Case id is required' }, { status: 400 })
  }

  const context = await getAuthorizedContext(caseId)

  if (context.response) {
    return context.response
  }

  const { data: invitations, error } = await context.supabase
    .from('invitations')
    .select(
      'id, recipient_contact, method, status, resend_email_id, delivery_status, delivery_last_event_at, delivery_last_event_type, delivery_error, sent_at, opened_at, accepted_at, expires_at, reminder_count, last_reminder_at',
    )
    .eq('case_id', caseId)
    .order('sent_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ invitations: invitations ?? [] })
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = invitationSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const context = await getAuthorizedContext(parsed.data.case_id)
  const origin = getRequestOrigin(req)

  if (context.response || !context.user || !context.caseItem) {
    return context.response!
  }

  const recipientContact = normalizeEmail(parsed.data.recipient_contact)
  const ownEmail = normalizeEmail(context.profile?.email ?? '')

  if (ownEmail && recipientContact === ownEmail) {
    return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 409 })
  }

  if (parsed.data.resend_invitation_id) {
    const { data: previousInvitation, error: previousInvitationError } = await context.supabase
      .from('invitations')
      .select('*')
      .eq('id', parsed.data.resend_invitation_id)
      .eq('case_id', parsed.data.case_id)
      .single()

    if (previousInvitationError || !previousInvitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (previousInvitation.status === 'accepted') {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 409 })
    }

    return (
      await createAndSendInvitation({
        supabase: context.supabase,
        caseId: parsed.data.case_id,
        initiatorId: context.user.id,
        recipientContact,
        origin,
        preferredLanguage: context.profile?.preferred_language || 'en',
        previousInvitationId: previousInvitation.id,
      })
    ).response
  }

  const { data: existingInvitation } = await context.supabase
    .from('invitations')
    .select('id')
    .eq('case_id', parsed.data.case_id)
    .eq('recipient_contact', recipientContact)
    .in('status', ['sent', 'opened'])
    .neq('delivery_status', 'failed')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existingInvitation) {
    return NextResponse.json(
      {
        error: 'Active invitation already exists',
        invitation_id: existingInvitation.id,
      },
      { status: 409 },
    )
  }

  return (
    await createAndSendInvitation({
      supabase: context.supabase,
      caseId: parsed.data.case_id,
      initiatorId: context.user.id,
      recipientContact,
      origin,
      preferredLanguage: context.profile?.preferred_language || 'en',
    })
  ).response
}
