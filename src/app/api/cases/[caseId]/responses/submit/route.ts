import { NextResponse } from 'next/server'

import { getAuthorizedCase } from '@/lib/cases/auth'
import { getRequestOrigin } from '@/lib/app-url'
import { sendResponderCompletedEmail } from '@/lib/email/resend'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/timeline'

async function resolveNextStatus(caseId: string, initiatorId: string, responderId: string | null) {
  const [initiatorSubmittedResult, responderSubmittedResult] = await Promise.all([
    supabaseAdmin
      .from('responses')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', caseId)
      .eq('user_id', initiatorId)
      .not('submitted_at', 'is', null),
    responderId
      ? supabaseAdmin
          .from('responses')
          .select('id', { count: 'exact', head: true })
          .eq('case_id', caseId)
          .eq('user_id', responderId)
          .not('submitted_at', 'is', null)
      : Promise.resolve({ count: 0, error: null }),
  ])

  const initiatorSubmitted = Boolean(initiatorSubmittedResult.count)
  const responderSubmitted = Boolean(responderSubmittedResult.count)

  if (initiatorSubmitted && responderSubmitted) {
    return 'comparison' as const
  }

  if (initiatorSubmitted && responderId) {
    return 'active' as const
  }

  if (initiatorSubmitted) {
    return 'invited' as const
  }

  return 'draft' as const
}

export async function POST(
  req: Request,
  { params }: { params: { caseId: string } },
) {
  const { supabase, user, caseItem, response } = await getAuthorizedCase(params.caseId)

  if (response) {
    return response
  }
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!caseItem) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  const { data: userResponses, error: responsesError } = await supabase
    .from('responses')
    .select('id, submitted_at')
    .eq('case_id', params.caseId)
    .eq('user_id', user.id)

  if (responsesError) {
    return NextResponse.json({ error: responsesError.message }, { status: 400 })
  }

  if (!userResponses?.length) {
    return NextResponse.json({ error: 'No responses found for submission' }, { status: 400 })
  }

  const alreadySubmitted = userResponses.every((item) => item.submitted_at !== null)

  if (alreadySubmitted) {
    const resolvedStatus = await resolveNextStatus(
      params.caseId,
      caseItem.initiator_id,
      caseItem.responder_id,
    )

    if (resolvedStatus !== caseItem.status) {
      const { error: statusRepairError } = await supabaseAdmin
        .from('cases')
        .update({ status: resolvedStatus })
        .eq('id', params.caseId)

      if (statusRepairError) {
        return NextResponse.json({ error: statusRepairError.message }, { status: 400 })
      }

      if (resolvedStatus === 'comparison') {
        await logEvent(params.caseId, 'comparison_generated', user.id)
      }
    }

    return NextResponse.json({
      success: true,
      status: resolvedStatus,
      alreadySubmitted: true,
    })
  }

  const submittedAt = new Date().toISOString()
  const { error: submitError } = await supabase
    .from('responses')
    .update({ submitted_at: submittedAt })
    .eq('case_id', params.caseId)
    .eq('user_id', user.id)
    .is('submitted_at', null)

  if (submitError) {
    return NextResponse.json({ error: submitError.message }, { status: 400 })
  }

  const nextStatus = await resolveNextStatus(
    params.caseId,
    caseItem.initiator_id,
    caseItem.responder_id,
  )

  const { error: caseUpdateError } = await supabase
    .from('cases')
    .update({ status: nextStatus })
    .eq('id', params.caseId)

  if (caseUpdateError) {
    return NextResponse.json({ error: caseUpdateError.message }, { status: 400 })
  }

  await logEvent(params.caseId, 'questions_completed', user.id)

  if (caseItem.responder_id === user.id) {
    await logEvent(params.caseId, 'responder_completed', user.id)

    const { data: initiatorProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', caseItem.initiator_id)
      .maybeSingle()

    if (initiatorProfile?.email) {
      await sendResponderCompletedEmail(
        initiatorProfile.email,
        params.caseId,
        initiatorProfile.preferred_language || 'en',
        getRequestOrigin(req),
      ).catch(() => null)
    }

    if (nextStatus === 'comparison') {
      await logEvent(params.caseId, 'comparison_generated', user.id)
    }
  }

  return NextResponse.json({ success: true, status: nextStatus })
}
