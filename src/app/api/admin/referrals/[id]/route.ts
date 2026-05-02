import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api-errors'
import { requireAdmin } from '@/lib/admin/auth'
import { updateReferralRequestTriage } from '@/lib/referrals/service'

const triageSchema = z.object({
  triageStatus: z.enum(['new', 'reviewing', 'matched', 'closed', 'cancelled']),
  internalNotes: z.string().max(3000).optional(),
  specialistId: z.string().uuid().nullable().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  await requireAdmin(req.headers.get('x-fairsettle-locale') || 'en')

  const parsed = triageSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, { details: parsed.error.issues })
  }

  try {
    const referralRequest = await updateReferralRequestTriage({
      requestId: params.id,
      triageStatus: parsed.data.triageStatus,
      internalNotes: parsed.data.internalNotes,
      specialistId: parsed.data.specialistId ?? null,
    })

    return NextResponse.json({ referral_request: referralRequest })
  } catch {
    return apiError(req, 'SAVE_FAILED', 400)
  }
}
