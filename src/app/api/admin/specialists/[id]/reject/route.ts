import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api-errors'
import { buildAppUrl, getRequestOrigin } from '@/lib/app-url'
import { requireAdmin } from '@/lib/admin/auth'
import { sendSpecialistRejectionEmail } from '@/lib/email/resend'
import { coerceSupportedLocale } from '@/lib/locale-path'
import { rejectSpecialistApplication } from '@/lib/referrals/service'
import { supabaseAdmin } from '@/lib/supabase/admin'

const rejectSchema = z.object({
  reviewNotes: z.string().min(1).max(3000),
})

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const locale = coerceSupportedLocale(req.headers.get('x-fairsettle-locale'))
  const admin = await requireAdmin(locale)
  const parsed = rejectSchema.safeParse(await req.json().catch(() => null))

  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, { details: parsed.error.issues })
  }

  try {
    const { data: application } = await supabaseAdmin
      .from('specialist_applications')
      .select('email')
      .eq('id', params.id)
      .maybeSingle()

    await rejectSpecialistApplication({
      applicationId: params.id,
      adminUserId: admin.userId,
      reviewNotes: parsed.data.reviewNotes,
    })

    if (application?.email && process.env.RESEND_API_KEY) {
      await sendSpecialistRejectionEmail({
        userEmail: application.email,
        reviewNotes: parsed.data.reviewNotes,
        applyUrl: buildAppUrl('/professional/apply', locale, getRequestOrigin(req)),
      }).catch(() => null)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return apiError(req, 'SAVE_FAILED', 400)
  }
}
