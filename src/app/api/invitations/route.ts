import { NextResponse } from 'next/server'
import { z } from 'zod'

import { sendInvitationEmail } from '@/lib/email/resend'
import { generateInvitationToken } from '@/lib/invitations'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/timeline'

const invitationSchema = z.object({
  case_id: z.string().uuid(),
  recipient_contact: z.string().email(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = invitationSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { data: caseItem, error: caseError } = await supabase
    .from('cases')
    .select('*')
    .eq('id', parsed.data.case_id)
    .single()

  if (caseError || !caseItem) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  if (caseItem.initiator_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const token = generateInvitationToken()
  const expiresAt = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()

  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .insert({
      case_id: parsed.data.case_id,
      method: 'email',
      recipient_contact: parsed.data.recipient_contact,
      token,
      expires_at: expiresAt,
    })
    .select('*')
    .single()

  if (invitationError || !invitation) {
    return NextResponse.json(
      { error: invitationError?.message ?? 'Unable to create invitation' },
      { status: 400 },
    )
  }

  try {
    await sendInvitationEmail(
      parsed.data.recipient_contact,
      token,
      profile?.full_name ?? '',
      profile?.preferred_language || 'en',
    )
  } catch (error) {
    await supabase.from('invitations').delete().eq('id', invitation.id)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to send invitation' },
      { status: 500 },
    )
  }

  await supabase.from('cases').update({ status: 'invited' }).eq('id', parsed.data.case_id)
  await logEvent(parsed.data.case_id, 'invitation_sent', user.id, { invitation_id: invitation.id })

  return NextResponse.json({
    invitation_id: invitation.id,
    token,
    expires_at: expiresAt,
  })
}
