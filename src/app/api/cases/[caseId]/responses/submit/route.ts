import { NextResponse } from 'next/server'

import { getAuthorizedCase } from '@/lib/cases/auth'
import { getRequestOrigin } from '@/lib/app-url'
import { sendResponderCompletedEmail } from '@/lib/email/resend'
import { logEvent } from '@/lib/timeline'

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
    return NextResponse.json({
      success: true,
      status: caseItem.status,
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

  let nextStatus = caseItem.status

  if (caseItem.initiator_id === user.id) {
    nextStatus = 'invited'
  } else {
    const { data: initiatorResponse } = await supabase
      .from('responses')
      .select('id')
      .eq('case_id', params.caseId)
      .eq('user_id', caseItem.initiator_id)
      .not('submitted_at', 'is', null)
      .limit(1)
      .maybeSingle()

    nextStatus = initiatorResponse ? 'comparison' : 'active'
  }

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
