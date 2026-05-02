import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api-errors'
import { getAuthorizedCase } from '@/lib/cases/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createReferral } from '@/lib/referrals/service'

const createReferralSchema = z.object({
  caseId: z.string().uuid(),
  referralRequestId: z.string().uuid().nullable().optional(),
  specialistId: z.string().uuid(),
  source: z.enum(['resolution_cta', 'mediator_assist', 'marketplace', 'admin']),
  paymentModel: z.enum(['request_only', 'mediator_assist', 'connect_checkout', 'solicitor_off_platform']),
})

export async function POST(req: Request) {
  const parsed = createReferralSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, { details: parsed.error.issues })
  }

  const { user, response } = await getAuthorizedCase(parsed.data.caseId, req)
  if (response) {
    return response
  }
  if (!user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  try {
    const referral = await createReferral({
      caseId: parsed.data.caseId,
      referralRequestId: parsed.data.referralRequestId ?? null,
      specialistId: parsed.data.specialistId,
      requestedByUserId: user.id,
      source: parsed.data.source,
      paymentModel: parsed.data.paymentModel,
    })

    return NextResponse.json({ referral })
  } catch {
    return apiError(req, 'SAVE_FAILED', 400)
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const caseId = url.searchParams.get('caseId')

  if (!caseId) {
    return apiError(req, 'VALIDATION_FAILED', 400, { details: 'caseId is required' })
  }

  const { user, response } = await getAuthorizedCase(caseId, req)
  if (response) {
    return response
  }
  if (!user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const { data, error } = await supabaseAdmin
    .from('referrals')
    .select('*, specialists(id, full_name, specialist_type, rating_average, rating_count)')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })

  if (error) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  return NextResponse.json({ referrals: data ?? [], viewer_user_id: user.id })
}
