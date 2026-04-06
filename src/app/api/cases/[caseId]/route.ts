import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api-errors'
import { getCaseFlowState } from '@/lib/cases/flow-state'
import { getAuthorizedCase } from '@/lib/cases/auth'

const updateCaseSchema = z.object({
  status: z.enum(['draft', 'invited', 'active', 'comparison', 'completed', 'expired']),
})

export async function GET(
  req: Request,
  { params }: { params: { caseId: string } },
) {
  const { caseItem, user, response } = await getAuthorizedCase(params.caseId, req)

  if (response || !caseItem) {
    return response
  }

  return NextResponse.json({
    case: {
      ...caseItem,
      viewer_role: caseItem.initiator_id === user?.id ? 'initiator' : 'responder',
      flow_state: user ? await getCaseFlowState(caseItem, user.id) : 'default',
    },
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: { caseId: string } },
) {
  const { supabase, caseItem, user, response } = await getAuthorizedCase(params.caseId, req)

  if (response || !caseItem || !user) {
    return response
  }

  if (caseItem.initiator_id !== user.id) {
    return apiError(req, 'FORBIDDEN', 403)
  }

  const body = await req.json()
  const parsed = updateCaseSchema.safeParse(body)

  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, {
      details: parsed.error.issues,
    })
  }

  const { data, error } = await supabase
    .from('cases')
    .update({ status: parsed.data.status })
    .eq('id', params.caseId)
    .select('*')
    .single()

  if (error || !data) {
    return apiError(req, 'CASE_UPDATE_FAILED', 400)
  }

  return NextResponse.json({ case: data })
}

export async function DELETE(
  req: Request,
  { params }: { params: { caseId: string } },
) {
  const { supabase, user, caseItem, response } = await getAuthorizedCase(params.caseId, req)

  if (response || !caseItem || !user) {
    return response
  }

  if (caseItem.initiator_id !== user.id || caseItem.status !== 'draft') {
    return apiError(req, 'CASE_DELETE_FORBIDDEN', 403)
  }

  const { error } = await supabase.from('cases').delete().eq('id', params.caseId)

  if (error) {
    return apiError(req, 'CASE_DELETE_FAILED', 400)
  }

  return NextResponse.json({ success: true })
}
