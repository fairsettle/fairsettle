import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api-errors'
import { createClient } from '@/lib/supabase/server'
import { respondToRecommendation } from '@/lib/referrals/service'

const responseSchema = z.object({
  recommendationId: z.string().uuid(),
  responseId: z.string().uuid(),
  action: z.enum(['accept', 'modify', 'reject']),
  responseValue: z.any().nullable().optional(),
  comment: z.string().max(2000).optional(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const parsed = responseSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, { details: parsed.error.issues })
  }

  try {
    const response = await respondToRecommendation({
      recommendationId: parsed.data.recommendationId,
      responseId: parsed.data.responseId,
      userId: user.id,
      action: parsed.data.action,
      responseValue: parsed.data.responseValue ?? null,
      comment: parsed.data.comment,
    })

    return NextResponse.json({ response })
  } catch {
    return apiError(req, 'SAVE_FAILED', 400)
  }
}
