import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { getAiDisclaimer } from '@/lib/ai/disclaimer'
import { getNarrativeSummaryForCase } from '@/lib/ai/narratives'
import { getAuthorizedCase } from '@/lib/cases/auth'
import { buildSafeComparisonPayload } from '@/lib/comparison'
import { coerceSupportedLocale } from '@/lib/locale-path'
import { loadMessages } from '@/lib/messages'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/timeline'

export async function GET(
  req: Request,
  { params }: { params: { caseId: string } },
) {
  const { user, caseItem, response } = await getAuthorizedCase(params.caseId, req)

  if (response) {
    return response
  }
  if (!user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }
  if (!caseItem) {
    return apiError(req, 'CASE_NOT_FOUND', 404)
  }

  if (!caseItem.responder_id) {
    return apiError(req, 'COMPARISON_NOT_READY', 403)
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
    return apiError(req, 'COMPARISON_NOT_READY', 403)
  }

  try {
    const locale = coerceSupportedLocale(new URL(req.url).searchParams.get('locale'))
    const payload = await buildSafeComparisonPayload({
      caseType: caseItem.case_type,
      caseId: params.caseId,
      initiatorId: caseItem.initiator_id,
      responderId: caseItem.responder_id,
      viewerRole: caseItem.initiator_id === user.id ? 'initiator' : 'responder',
      questionSetVersion: caseItem.question_set_version,
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

    const [narrativeSummary, messages] = await Promise.all([
      getNarrativeSummaryForCase({
        caseId: params.caseId,
        viewerUserId: user.id,
        locale,
      }),
      loadMessages(locale),
    ])

    return NextResponse.json({
      ...payload,
      narrative_summary: narrativeSummary.text,
      narrative_summary_mode: narrativeSummary.mode,
      ai_disclaimer:
        narrativeSummary.mode === 'ai' ? getAiDisclaimer(messages) : null,
    })
  } catch (error) {
    return apiError(req, 'FETCH_FAILED', 400)
  }
}
