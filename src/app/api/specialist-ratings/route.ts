import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api-errors'
import { getAuthorizedCase } from '@/lib/cases/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createSpecialistRating } from '@/lib/referrals/service'

const ratingSchema = z.object({
  referralId: z.string().uuid(),
  specialistId: z.string().uuid(),
  caseId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  reviewText: z.string().max(1200).optional(),
})

export async function POST(req: Request) {
  const parsed = ratingSchema.safeParse(await req.json().catch(() => null))
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

  const { data: referral } = await supabaseAdmin
    .from('referrals')
    .select('id')
    .eq('id', parsed.data.referralId)
    .eq('case_id', parsed.data.caseId)
    .eq('specialist_id', parsed.data.specialistId)
    .eq('status', 'completed')
    .maybeSingle()

  if (!referral) {
    return apiError(req, 'FORBIDDEN', 403)
  }

  try {
    const rating = await createSpecialistRating({
      referralId: parsed.data.referralId,
      specialistId: parsed.data.specialistId,
      caseId: parsed.data.caseId,
      userId: user.id,
      rating: parsed.data.rating,
      reviewText: parsed.data.reviewText,
    })

    return NextResponse.json({ rating })
  } catch {
    return apiError(req, 'SAVE_FAILED', 400)
  }
}
