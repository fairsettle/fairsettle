import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api-errors'
import { getAppOrigin, getRequestOrigin } from '@/lib/app-url'
import { requireAdmin } from '@/lib/admin/auth'
import { sendSpecialistApprovalEmail } from '@/lib/email/resend'
import { approveSpecialistApplication } from '@/lib/referrals/service'
import { coerceSupportedLocale, getStrictLocalizedPath } from '@/lib/locale-path'
import { supabaseAdmin } from '@/lib/supabase/admin'

const approveSchema = z.object({
  verificationSource: z.string().min(1),
  verificationNotes: z.string().max(3000).optional(),
  profileId: z.string().uuid().nullable().optional(),
})

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const locale = coerceSupportedLocale(req.headers.get('x-fairsettle-locale'))
  const admin = await requireAdmin(locale)
  const parsed = approveSchema.safeParse(await req.json().catch(() => null))

  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, { details: parsed.error.issues })
  }

  try {
    const specialist = await approveSpecialistApplication({
      applicationId: params.id,
      adminUserId: admin.userId,
      verificationSource: parsed.data.verificationSource,
      verificationNotes: parsed.data.verificationNotes,
      profileId: parsed.data.profileId ?? null,
    })

    if (specialist.email && process.env.RESEND_API_KEY) {
      await sendSpecialistApprovalEmail({
        userEmail: specialist.email,
        dashboardUrl: `${getAppOrigin(getRequestOrigin(req))}${getStrictLocalizedPath(locale, '/professional/dashboard')}`,
      }).catch(() => null)
    }

    return NextResponse.json({ specialist })
  } catch {
    return apiError(req, 'SAVE_FAILED', 400)
  }
}
