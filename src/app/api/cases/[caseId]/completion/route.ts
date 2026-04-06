import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { getAuthorizedCase } from '@/lib/cases/auth'
import { isExportUnlocked } from '@/lib/cases/export-gating'
import { getRequestOrigin } from '@/lib/app-url'
import { sendCaseCompletionMarkedEmail } from '@/lib/email/resend'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/timeline'

export async function PATCH(
  req: Request,
  { params }: { params: { caseId: string } },
) {
  const { user, caseItem, response } = await getAuthorizedCase(params.caseId, req)

  if (response) {
    return response
  }
  if (!user || !caseItem) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  if (!caseItem.responder_id || !['comparison', 'completed'].includes(caseItem.status)) {
    return apiError(req, 'CASE_NOT_READY_FOR_COMPLETION', 409)
  }

  const now = new Date()
  const nowIso = now.toISOString()
  const viewerRole = caseItem.initiator_id === user.id ? 'initiator' : 'responder'
  const alreadyMarked =
    viewerRole === 'initiator'
      ? Boolean(caseItem.initiator_satisfied_at)
      : Boolean(caseItem.responder_satisfied_at)

  const update: Record<string, string | null> = {}

  if (!alreadyMarked) {
    update[viewerRole === 'initiator' ? 'initiator_satisfied_at' : 'responder_satisfied_at'] = nowIso
  }

  const nextInitiatorSatisfiedAt =
    update.initiator_satisfied_at ?? caseItem.initiator_satisfied_at
  const nextResponderSatisfiedAt =
    update.responder_satisfied_at ?? caseItem.responder_satisfied_at

  if (!nextInitiatorSatisfiedAt || !nextResponderSatisfiedAt) {
    update.auto_generate_due_at =
      caseItem.auto_generate_due_at ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  }

  const { data: updatedCase, error } = await supabaseAdmin
    .from('cases')
    .update(update)
    .eq('id', params.caseId)
    .select('*')
    .single()

  if (error || !updatedCase) {
    return apiError(req, 'SAVE_FAILED', 400)
  }

  await logEvent(params.caseId, 'resolution_accepted', user.id, {
    action: 'case_completion_marked',
    viewer_role: viewerRole,
  })

  const recipientId = viewerRole === 'initiator' ? caseItem.responder_id : caseItem.initiator_id

  if (recipientId) {
    const { data: recipientProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, preferred_language')
      .eq('id', recipientId)
      .maybeSingle()

    if (recipientProfile?.email) {
      await sendCaseCompletionMarkedEmail(
        recipientProfile.email,
        params.caseId,
        recipientProfile.preferred_language || 'en',
        getRequestOrigin(req),
      ).catch(() => null)
    }
  }

  return NextResponse.json({
    case: updatedCase,
    export_unlocked: isExportUnlocked(updatedCase),
    viewer_role: viewerRole,
  })
}
