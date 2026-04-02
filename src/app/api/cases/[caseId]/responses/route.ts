import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAuthorizedCase } from '@/lib/cases/auth'

const responseSchema = z.object({
  question_id: z.string().uuid(),
  answer_value: z.object({
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  }),
})

async function getAuthorizedContext(caseId: string) {
  const { supabase, user, response } = await getAuthorizedCase(caseId)
  return { supabase, user, response }
}

export async function GET(
  _req: Request,
  { params }: { params: { caseId: string } },
) {
  const { supabase, user, response } = await getAuthorizedContext(params.caseId)

  if (response) {
    return response
  }
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('responses')
    .select('*')
    .eq('case_id', params.caseId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ responses: data ?? [] })
}

export async function POST(
  req: Request,
  { params }: { params: { caseId: string } },
) {
  const { supabase, user, response } = await getAuthorizedContext(params.caseId)

  if (response) {
    return response
  }
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = responseSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { data: existingResponse } = await supabase
    .from('responses')
    .select('id, version')
    .eq('case_id', params.caseId)
    .eq('user_id', user.id)
    .eq('question_id', parsed.data.question_id)
    .maybeSingle()

  if (existingResponse) {
    const { data, error } = await supabase
      .from('responses')
      .update({
        answer_value: parsed.data.answer_value,
        version: existingResponse.version + 1,
      })
      .eq('id', existingResponse.id)
      .select('*')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Unable to update response' }, { status: 400 })
    }

    return NextResponse.json({ response: data })
  }

  const { data, error } = await supabase
    .from('responses')
    .insert({
      case_id: params.caseId,
      user_id: user.id,
      question_id: parsed.data.question_id,
      answer_value: parsed.data.answer_value,
    })
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Unable to save response' }, { status: 400 })
  }

  return NextResponse.json({ response: data }, { status: 201 })
}
