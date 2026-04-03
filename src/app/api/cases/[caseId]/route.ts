import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAuthorizedCase } from '@/lib/cases/auth'

const updateCaseSchema = z.object({
  status: z.enum(['draft', 'invited', 'active', 'comparison', 'completed', 'expired']),
})

export async function GET(
  _req: Request,
  { params }: { params: { caseId: string } },
) {
  const { caseItem, user, response } = await getAuthorizedCase(params.caseId)

  if (response || !caseItem) {
    return response
  }

  return NextResponse.json({
    case: {
      ...caseItem,
      viewer_role: caseItem.initiator_id === user?.id ? 'initiator' : 'responder',
    },
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: { caseId: string } },
) {
  const { supabase, caseItem, response } = await getAuthorizedCase(params.caseId)

  if (response || !caseItem) {
    return response
  }

  const body = await req.json()
  const parsed = updateCaseSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('cases')
    .update({ status: parsed.data.status })
    .eq('id', params.caseId)
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Unable to update case' }, { status: 400 })
  }

  return NextResponse.json({ case: data })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { caseId: string } },
) {
  const { supabase, user, caseItem, response } = await getAuthorizedCase(params.caseId)

  if (response || !caseItem || !user) {
    return response
  }

  if (caseItem.initiator_id !== user.id || caseItem.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft cases can be deleted by the initiator' }, { status: 403 })
  }

  const { error } = await supabase.from('cases').delete().eq('id', params.caseId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
