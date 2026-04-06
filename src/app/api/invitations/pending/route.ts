import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-errors'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const userEmail = normalizeEmail(user.email ?? '')

  if (!userEmail) {
    return NextResponse.json({ invitations: [] })
  }

  const now = new Date().toISOString()

  const { data: invitations, error: invitationsError } = await supabaseAdmin
    .from('invitations')
    .select('id, case_id, token, status, sent_at, opened_at, accepted_at, expires_at, recipient_contact')
    .eq('recipient_contact', userEmail)
    .in('status', ['sent', 'opened'])
    .gt('expires_at', now)
    .order('sent_at', { ascending: false })

  if (invitationsError) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  if (!invitations?.length) {
    return NextResponse.json({ invitations: [] })
  }

  const caseIds = [...new Set(invitations.map((invitation) => invitation.case_id))]

  const { data: cases, error: casesError } = await supabaseAdmin
    .from('cases')
    .select('id, case_type, status, initiator_id, responder_id')
    .in('id', caseIds)

  if (casesError) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  const relevantCases = (cases ?? []).filter(
    (caseItem) => !caseItem.responder_id || caseItem.responder_id === user.id,
  )

  if (!relevantCases.length) {
    return NextResponse.json({ invitations: [] })
  }

  const initiatorIds = [...new Set(relevantCases.map((caseItem) => caseItem.initiator_id))]

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', initiatorIds)

  if (profilesError) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  const caseMap = new Map(relevantCases.map((caseItem) => [caseItem.id, caseItem]))
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  const pendingInvitations = invitations
    .map((invitation) => {
      const caseItem = caseMap.get(invitation.case_id)

      if (!caseItem) {
        return null
      }

      const initiator = profileMap.get(caseItem.initiator_id)

      return {
        id: invitation.id,
        case_id: invitation.case_id,
        token: invitation.token,
        status: invitation.status,
        sent_at: invitation.sent_at,
        opened_at: invitation.opened_at,
        expires_at: invitation.expires_at,
        case_type: caseItem.case_type,
        initiator_name: initiator?.full_name || initiator?.email || null,
      }
    })
    .filter((invitation): invitation is NonNullable<typeof invitation> => invitation !== null)

  return NextResponse.json({ invitations: pendingInvitations })
}
