import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import {
  sendAutoGenerateWarningEmail,
  sendReminderEmail,
  sendSinglePartyExportReadyEmail,
} from '@/lib/email/resend'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/timeline'
import type { Database } from '@/types/database'

type InvitationRow = Database['public']['Tables']['invitations']['Row']
type CaseRow = Database['public']['Tables']['cases']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

interface InvitationContext {
  invitation: InvitationRow
  caseItem: CaseRow | null
  initiatorProfile: ProfileRow | null
}

async function loadInvitationContexts(invitations: InvitationRow[]): Promise<InvitationContext[]> {
  if (!invitations.length) {
    return []
  }

  const caseIds = [...new Set(invitations.map((invitation) => invitation.case_id))]
  const { data: cases, error: casesError } = await supabaseAdmin
    .from('cases')
    .select('*')
    .in('id', caseIds)

  if (casesError) {
    throw new Error(casesError.message)
  }

  const caseMap = new Map((cases ?? []).map((caseItem) => [caseItem.id, caseItem]))
  const initiatorIds = [...new Set((cases ?? []).map((caseItem) => caseItem.initiator_id))]

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .in('id', initiatorIds)

  if (profilesError) {
    throw new Error(profilesError.message)
  }

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  return invitations.map((invitation) => {
    const caseItem = caseMap.get(invitation.case_id) ?? null

    return {
      invitation,
      caseItem,
      initiatorProfile: caseItem ? profileMap.get(caseItem.initiator_id) ?? null : null,
    }
  })
}

async function processReminderBatch({
  invitations,
  reminderNumber,
  daysRemaining,
}: {
  invitations: InvitationRow[]
  reminderNumber: 1 | 2 | 3
  daysRemaining: number
}) {
  const contexts = await loadInvitationContexts(invitations)
  let processed = 0
  const processedAt = new Date().toISOString()

  for (const { invitation, caseItem } of contexts) {
    if (!caseItem || invitation.method !== 'email') {
      continue
    }

    try {
      await sendReminderEmail(
        invitation.recipient_contact,
        invitation.token,
        reminderNumber,
        daysRemaining,
        'en',
      )
    } catch {
      continue
    }

    const { error: updateError } = await supabaseAdmin
      .from('invitations')
      .update({
        reminder_count: reminderNumber,
        last_reminder_at: processedAt,
      })
      .eq('id', invitation.id)

    if (updateError) {
      continue
    }

    await logEvent(caseItem.id, 'reminder_sent', null, {
      invitation_id: invitation.id,
      reminder_number: reminderNumber,
      days_remaining: daysRemaining,
    })

    processed += 1
  }

  return processed
}

async function processExpiryBatch(invitations: InvitationRow[]) {
  const contexts = await loadInvitationContexts(invitations)
  let processed = 0

  for (const { invitation, caseItem, initiatorProfile } of contexts) {
    if (!caseItem) {
      continue
    }

    const { error: invitationError } = await supabaseAdmin
      .from('invitations')
      .update({
        status: 'expired',
      })
      .eq('id', invitation.id)

    if (invitationError) {
      continue
    }

    await supabaseAdmin
      .from('cases')
      .update({
        status: 'expired',
      })
      .eq('id', caseItem.id)

    await logEvent(caseItem.id, 'invitation_expired', null, {
      invitation_id: invitation.id,
    })
    await logEvent(caseItem.id, 'case_expired', caseItem.initiator_id, {
      invitation_id: invitation.id,
    })

    if (initiatorProfile?.email) {
      await sendSinglePartyExportReadyEmail(
        initiatorProfile.email,
        caseItem.id,
        initiatorProfile.preferred_language || 'en',
      ).catch(() => null)
    }

    processed += 1
  }

  return processed
}

async function processAutoGenerateWarningBatch(cases: CaseRow[]) {
  if (!cases.length) {
    return 0
  }

  const participantIds = [
    ...new Set(
      cases.flatMap((caseItem) => [caseItem.initiator_id, caseItem.responder_id].filter(Boolean) as string[]),
    ),
  ]

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, preferred_language')
    .in('id', participantIds)

  if (profilesError) {
    throw new Error(profilesError.message)
  }

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const processedAt = new Date().toISOString()
  let processed = 0

  for (const caseItem of cases) {
    const onlyOneSatisfied =
      Boolean(caseItem.initiator_satisfied_at) !== Boolean(caseItem.responder_satisfied_at)

    if (!caseItem.auto_generate_due_at || !onlyOneSatisfied) {
      continue
    }

    const dueDateLabel = new Date(caseItem.auto_generate_due_at).toLocaleDateString('en-GB')
    const recipients = [caseItem.initiator_id, caseItem.responder_id].filter(Boolean) as string[]
    let sentAllWarnings = true

    for (const recipientId of recipients) {
      const profile = profileMap.get(recipientId)

      if (!profile?.email) {
        continue
      }

      try {
        await sendAutoGenerateWarningEmail(
          profile.email,
          caseItem.id,
          dueDateLabel,
          profile.preferred_language || 'en',
        )
      } catch {
        sentAllWarnings = false
        break
      }
    }

    if (!sentAllWarnings) {
      continue
    }

    const { error: updateError } = await supabaseAdmin
      .from('cases')
      .update({
        auto_generate_warning_sent_at: processedAt,
      })
      .eq('id', caseItem.id)

    if (updateError) {
      continue
    }

    processed += 1
  }

  return processed
}

async function handleCronRequest(req: Request) {
  if (!process.env.CRON_SECRET) {
    return apiError(req, 'INTERNAL_ERROR', 500)
  }

  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const now = Date.now()
  const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000).toISOString()
  const fortyNineHoursAgo = new Date(now - 49 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString()
  const nowIso = new Date(now).toISOString()
  const fortyNineHoursFromNow = new Date(now + 49 * 60 * 60 * 1000).toISOString()
  const fortySevenHoursFromNow = new Date(now + 47 * 60 * 60 * 1000).toISOString()

  const [remind48hResult, remind7dResult, remind14dResult, expireResult, autoGenerateWarningResult] = await Promise.all([
    supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('method', 'email')
      .in('status', ['sent', 'opened'])
      .eq('reminder_count', 0)
      .gte('sent_at', fortyNineHoursAgo)
      .lte('sent_at', fortyEightHoursAgo),
    supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('method', 'email')
      .in('status', ['sent', 'opened'])
      .eq('reminder_count', 1)
      .lte('sent_at', sevenDaysAgo),
    supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('method', 'email')
      .in('status', ['sent', 'opened'])
      .eq('reminder_count', 2)
      .lte('sent_at', fourteenDaysAgo),
    supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('method', 'email')
      .in('status', ['sent', 'opened'])
      .lte('expires_at', nowIso),
    supabaseAdmin
      .from('cases')
      .select('*')
      .not('auto_generate_due_at', 'is', null)
      .is('auto_generate_warning_sent_at', null)
      .in('status', ['comparison', 'completed'])
      .gte('auto_generate_due_at', fortySevenHoursFromNow)
      .lte('auto_generate_due_at', fortyNineHoursFromNow),
  ])

  if (
    remind48hResult.error ||
    remind7dResult.error ||
    remind14dResult.error ||
    expireResult.error ||
    autoGenerateWarningResult.error
  ) {
    return NextResponse.json(
      {
        error:
          remind48hResult.error?.message ||
          remind7dResult.error?.message ||
          remind14dResult.error?.message ||
          expireResult.error?.message ||
          autoGenerateWarningResult.error?.message ||
          'Unable to load reminder batches',
      },
      { status: 500 },
    )
  }

  const remind48h = await processReminderBatch({
    invitations: remind48hResult.data ?? [],
    reminderNumber: 1,
    daysRemaining: 19,
  })
  const remind7d = await processReminderBatch({
    invitations: remind7dResult.data ?? [],
    reminderNumber: 2,
    daysRemaining: 14,
  })
  const remind14d = await processReminderBatch({
    invitations: remind14dResult.data ?? [],
    reminderNumber: 3,
    daysRemaining: 7,
  })
  const expired = await processExpiryBatch(expireResult.data ?? [])
  const autoGenerateWarning = await processAutoGenerateWarningBatch(autoGenerateWarningResult.data ?? [])

  return NextResponse.json({
    processed: {
      remind_48h: remind48h,
      remind_7d: remind7d,
      remind_14d: remind14d,
      expired,
      auto_generate_warning: autoGenerateWarning,
    },
  })
}

export async function GET(req: Request) {
  return handleCronRequest(req)
}

export async function POST(req: Request) {
  return handleCronRequest(req)
}
