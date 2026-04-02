import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSavingsStageFromCaseStatus, calculateSavings } from '@/lib/savings/calculator'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/timeline'

const createCaseSchema = z.object({
  case_type: z.enum(['child', 'financial', 'asset', 'combined']),
})

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('cases')
    .select('id, case_type, status, created_at, initiator_id, responder_id')
    .or(`initiator_id.eq.${user.id},responder_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const cases = (data ?? []).map((caseItem) => ({
    ...caseItem,
    savings_to_date: calculateSavings(getSavingsStageFromCaseStatus(caseItem.status)).saved,
  }))

  return NextResponse.json({ cases })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createCaseSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('cases')
    .insert({
      initiator_id: user.id,
      case_type: parsed.data.case_type,
    })
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Unable to create case' }, { status: 400 })
  }

  await logEvent(data.id, 'case_created', user.id, { case_type: data.case_type })

  return NextResponse.json({ case: data }, { status: 201 })
}
