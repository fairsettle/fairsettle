import { randomBytes } from 'crypto'

import { sendResponderAcceptedEmail } from '@/lib/email/resend'
import { getLocalizedMessage } from '@/lib/questions'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/timeline'
import type { Database } from '@/types/database'

type InvitationRow = Database['public']['Tables']['invitations']['Row']
type CaseRow = Database['public']['Tables']['cases']['Row']

export function generateInvitationToken() {
  return randomBytes(32).toString('hex')
}

export async function getInvitationByToken(token: string) {
  const { data: invitation, error: invitationError } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (invitationError || !invitation) {
    return { invitation: null, caseItem: null, initiatorProfile: null }
  }

  const { data: caseItem } = await supabaseAdmin
    .from('cases')
    .select('*')
    .eq('id', invitation.case_id)
    .single()

  const { data: initiatorProfile } = caseItem
    ? await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', caseItem.initiator_id)
        .single()
    : { data: null }

  return { invitation, caseItem: caseItem ?? null, initiatorProfile: initiatorProfile ?? null }
}

export async function validateInvitationToken(token: string) {
  const { invitation, caseItem } = await getInvitationByToken(token)

  if (!invitation || !caseItem) {
    return { valid: false as const, reason: 'not_found' as const }
  }

  if (invitation.status === 'accepted') {
    return { valid: false as const, reason: 'already_accepted' as const }
  }

  const expired = new Date(invitation.expires_at).getTime() <= Date.now() || invitation.status === 'expired'

  if (expired) {
    return { valid: false as const, reason: 'expired' as const }
  }

  if (invitation.status === 'sent') {
    await supabaseAdmin
      .from('invitations')
      .update({
        status: 'opened',
        opened_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    await logEvent(caseItem.id, 'invitation_opened', null, { invitation_id: invitation.id })
  }

  return {
    valid: true as const,
    invitation: invitation.status === 'sent' ? { ...invitation, status: 'opened' as const } : invitation,
    caseItem,
  }
}

export async function acceptInvitationToken(token: string) {
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false as const, reason: 'unauthorized' as const }
  }

  const { invitation, caseItem } = await getInvitationByToken(token)

  if (!invitation || !caseItem) {
    return { success: false as const, reason: 'not_found' as const }
  }

  if (caseItem.initiator_id === user.id) {
    return { success: false as const, reason: 'own_case' as const }
  }

  if (invitation.status === 'accepted') {
    return caseItem.responder_id === user.id
      ? { success: true as const, caseId: caseItem.id }
      : { success: false as const, reason: 'already_accepted' as const }
  }

  if (caseItem.responder_id && caseItem.responder_id !== user.id) {
    return { success: false as const, reason: 'already_accepted' as const }
  }

  const expired = new Date(invitation.expires_at).getTime() <= Date.now() || invitation.status === 'expired'

  if (expired) {
    return { success: false as const, reason: 'expired' as const }
  }

  if (!caseItem.responder_id) {
    await supabaseAdmin
      .from('cases')
      .update({
        responder_id: user.id,
        status: 'active',
      })
      .eq('id', caseItem.id)

    await supabaseAdmin
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    await logEvent(caseItem.id, 'invitation_accepted', user.id, { invitation_id: invitation.id })
    await logEvent(caseItem.id, 'responder_started', user.id, {})

    const { data: initiatorProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', caseItem.initiator_id)
      .single()

    if (initiatorProfile?.email) {
      await sendResponderAcceptedEmail(
        initiatorProfile.email,
        caseItem.id,
        initiatorProfile.preferred_language || 'en',
      ).catch(() => null)
    }
  }

  return { success: true as const, caseId: caseItem.id }
}

export async function getResponderReviewItems(caseId: string) {
  const { data: caseItem } = await supabaseAdmin
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .single()

  if (!caseItem) {
    return []
  }

  const { data: initiatorResponses } = await supabaseAdmin
    .from('responses')
    .select('*')
    .eq('case_id', caseId)
    .eq('user_id', caseItem.initiator_id)
    .not('submitted_at', 'is', null)
    .order('created_at', { ascending: true })

  const questionIds = (initiatorResponses ?? []).map((response) => response.question_id)

  if (questionIds.length === 0) {
    return []
  }

  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('*')
    .in('id', questionIds)

  const questionMap = new Map((questions ?? []).map((question) => [question.id, question]))

  return (initiatorResponses ?? [])
    .map((response) => {
      const question = questionMap.get(response.question_id)

      if (!question) {
        return null
      }

      return {
        question_id: response.question_id,
        dispute_type: question.dispute_type,
        question_label: getLocalizedMessage(question.question_text, 'en'),
        answer_summary:
          typeof response.answer_value === 'object' &&
          response.answer_value &&
          !Array.isArray(response.answer_value)
            ? Array.isArray(response.answer_value.value)
              ? response.answer_value.value.join(', ')
              : String(response.answer_value.value ?? '')
            : '',
      }
    })
    .filter(
      (
        item,
      ): item is {
        question_id: string
        dispute_type: 'child' | 'financial' | 'asset'
        question_label: string
        answer_summary: string
      } => item !== null,
    )
}

export async function getResponderSavedReviewItems(caseId: string, userId: string) {
  const [completedTimelineRowsResult, startedTimelineRowsResult] = await Promise.all([
    supabaseAdmin
      .from('case_timeline')
      .select('event_data, created_at')
      .eq('case_id', caseId)
      .eq('user_id', userId)
      .eq('event_type', 'responder_completed')
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('case_timeline')
      .select('event_data, created_at')
      .eq('case_id', caseId)
      .eq('user_id', userId)
      .eq('event_type', 'responder_started')
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const latestRow = completedTimelineRowsResult.data?.[0] ?? startedTimelineRowsResult.data?.[0]

  if (
    !latestRow ||
    !latestRow.event_data ||
    typeof latestRow.event_data !== 'object' ||
    Array.isArray(latestRow.event_data)
  ) {
    return []
  }

  const reviewItems = latestRow.event_data.review_items

  if (!Array.isArray(reviewItems)) {
    return []
  }

  return reviewItems.filter((item): item is {
    question_id: string
    action: 'agree' | 'disagree' | 'counter'
    counter_text?: string
  } => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return false
    }

    return (
      typeof item.question_id === 'string' &&
      (item.action === 'agree' || item.action === 'disagree' || item.action === 'counter') &&
      (item.counter_text === undefined || typeof item.counter_text === 'string')
    )
  })
}

export async function getResponderReviewAccess(caseId: string, userId: string) {
  const [{ data: timelineRows }, { data: acceptedInvitation }, reviewItems] = await Promise.all([
    supabaseAdmin
      .from('case_timeline')
      .select('event_data, created_at')
      .eq('case_id', caseId)
      .eq('user_id', userId)
      .in('event_type', ['responder_started', 'responder_completed'])
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('invitations')
      .select('token')
      .eq('case_id', caseId)
      .eq('status', 'accepted')
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getResponderReviewItems(caseId),
  ])

  const hasCompletedReview = (timelineRows ?? []).some((row) => {
    const eventData = row.event_data

    return (
      eventData &&
      typeof eventData === 'object' &&
      !Array.isArray(eventData) &&
      Array.isArray(eventData.review_items) &&
      eventData.review_items.length > 0
    )
  })

  return {
    hasCompletedReview: hasCompletedReview || reviewItems.length === 0,
    invitationToken: acceptedInvitation?.token ?? null,
  }
}
