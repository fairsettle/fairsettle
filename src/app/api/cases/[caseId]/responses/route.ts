import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api-errors'
import { getAuthorizedCase } from '@/lib/cases/auth'
import { getDisputeTypesForCase } from '@/lib/questions'
import { supabaseAdmin } from '@/lib/supabase/admin'

const responseSchema = z.object({
  question_id: z.string().uuid(),
  child_id: z.string().uuid().nullable().optional(),
  answer_value: z.object({
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  }),
})

async function getAuthorizedContext(caseId: string) {
  const { supabase, user, caseItem, response } = await getAuthorizedCase(caseId)
  return { supabase, user, caseItem, response }
}

export async function GET(
  _req: Request,
  { params }: { params: { caseId: string } },
) {
  const { supabase, user, response } = await getAuthorizedCase(params.caseId, _req)

  if (response) {
    return response
  }
  if (!user) {
    return apiError(_req, 'UNAUTHORIZED', 401)
  }

  const { data, error } = await supabase
    .from('responses')
    .select('*')
    .eq('case_id', params.caseId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    return apiError(_req, 'FETCH_FAILED', 400)
  }

  return NextResponse.json({ responses: data ?? [] })
}

export async function POST(
  req: Request,
  { params }: { params: { caseId: string } },
) {
  const { supabase, user, caseItem, response } = await getAuthorizedCase(params.caseId, req)

  if (response || !caseItem) {
    return response ?? (await apiError(req, 'CASE_NOT_FOUND', 404))
  }
  if (!user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const body = await req.json()
  const parsed = responseSchema.safeParse(body)

  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, {
      details: parsed.error.issues,
    })
  }

  const disputeTypes = getDisputeTypesForCase(caseItem.case_type)
  const { data: question, error: questionError } = await supabase
    .from('questions')
    .select('id, is_per_child, question_set_version')
    .eq('id', parsed.data.question_id)
    .eq('question_set_version', caseItem.question_set_version)
    .in('dispute_type', disputeTypes)
    .eq('is_active', true)
    .maybeSingle()

  if (questionError) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  if (!question) {
    return apiError(req, 'QUESTION_INVALID_FOR_CASE', 400)
  }

  if (question.is_per_child && !parsed.data.child_id) {
    return apiError(req, 'CHILD_ID_REQUIRED', 400)
  }

  if (!question.is_per_child && parsed.data.child_id) {
    return apiError(req, 'CHILD_ID_NOT_ALLOWED', 400)
  }

  if (parsed.data.child_id) {
    const { data: child, error: childError } = await supabaseAdmin
      .from('children')
      .select('id')
      .eq('id', parsed.data.child_id)
      .eq('case_id', params.caseId)
      .maybeSingle()

    if (childError) {
      return apiError(req, 'FETCH_FAILED', 400)
    }

    if (!child) {
      return apiError(req, 'CHILD_INVALID_FOR_CASE', 400)
    }
  }

  let existingResponseQuery = supabase
    .from('responses')
    .select('id, version')
    .eq('case_id', params.caseId)
    .eq('user_id', user.id)
    .eq('question_id', parsed.data.question_id)

  existingResponseQuery = parsed.data.child_id
    ? existingResponseQuery.eq('child_id', parsed.data.child_id)
    : existingResponseQuery.is('child_id', null)

  const { data: existingResponse } = await existingResponseQuery.maybeSingle()

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
      return apiError(req, 'SAVE_FAILED', 400)
    }

    return NextResponse.json({ response: data })
  }

  const { data, error } = await supabase
    .from('responses')
    .insert({
      case_id: params.caseId,
      user_id: user.id,
      question_id: parsed.data.question_id,
      child_id: parsed.data.child_id ?? null,
      answer_value: parsed.data.answer_value,
    })
    .select('*')
    .single()

  if (error || !data) {
    return apiError(req, 'SAVE_FAILED', 400)
  }

  return NextResponse.json({ response: data }, { status: 201 })
}
