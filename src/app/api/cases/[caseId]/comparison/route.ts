import { NextResponse } from 'next/server'

import { getAuthorizedCase } from '@/lib/cases/auth'
import { buildSafeComparisonPayload } from '@/lib/comparison'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/timeline'

export async function GET(
  _req: Request,
  { params }: { params: { caseId: string } },
) {
  const { user, caseItem, response } = await getAuthorizedCase(params.caseId)

  if (response) {
    return response
  }
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!caseItem) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  if (!caseItem.responder_id) {
    return NextResponse.json({ error: 'Comparison not ready' }, { status: 409 })
  }

  const [initiatorSubmittedResult, responderSubmittedResult] = await Promise.all([
    supabaseAdmin
      .from('responses')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', params.caseId)
      .eq('user_id', caseItem.initiator_id)
      .not('submitted_at', 'is', null),
    supabaseAdmin
      .from('responses')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', params.caseId)
      .eq('user_id', caseItem.responder_id)
      .not('submitted_at', 'is', null),
  ])

  if (!initiatorSubmittedResult.count || !responderSubmittedResult.count) {
    return NextResponse.json({ error: 'Comparison not ready' }, { status: 409 })
  }

  try {
    const payload = await buildSafeComparisonPayload({
      caseType: caseItem.case_type,
      caseId: params.caseId,
      initiatorId: caseItem.initiator_id,
      responderId: caseItem.responder_id,
      viewerRole: caseItem.initiator_id === user.id ? 'initiator' : 'responder',
    })

    if (caseItem.status !== 'comparison') {
      const { data: updatedCase, error: updateError } = await supabaseAdmin
        .from('cases')
        .update({ status: 'comparison' })
        .eq('id', params.caseId)
        .eq('status', caseItem.status)
        .select('id')
        .maybeSingle()

      if (updateError) {
        throw new Error(updateError.message)
      }

      if (updatedCase) {
        await logEvent(params.caseId, 'comparison_generated', user.id)
      }
    }

    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to generate comparison' },
      { status: 400 },
    )
  }
}
