import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api-errors'
import { buildAppUrl, getRequestOrigin } from '@/lib/app-url'
import { getAuthorizedCase } from '@/lib/cases/auth'
import { sendReferralAcknowledgementEmail, sendReferralAdminEmail } from '@/lib/email/resend'
import { coerceSupportedLocale } from '@/lib/locale-path'
import { createReferralRequest } from '@/lib/referrals/service'
import { supabaseAdmin } from '@/lib/supabase/admin'

const referralRequestSchema = z.object({
  caseId: z.string().uuid(),
  specialistType: z.enum(['mediator', 'solicitor']),
  preferredTimeWindow: z.string().max(160).optional().default(''),
  locationPreference: z.enum(['remote', 'local', 'either']),
  locationText: z.string().max(160).optional().default(''),
  postcode: z.string().max(16).optional().default(''),
  message: z.string().max(1500).optional().default(''),
  source: z.enum(['resolution_cta', 'mediator_assist', 'marketplace', 'admin']).default('resolution_cta'),
  sourceExportId: z.string().uuid().optional().nullable(),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = referralRequestSchema.safeParse(body)

  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, { details: parsed.error.issues })
  }

  const { caseId } = parsed.data
  const { user, caseItem, response } = await getAuthorizedCase(caseId, req)

  if (response) {
    return response
  }
  if (!user || !caseItem) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const referralRequest = await createReferralRequest({
    caseId,
    requesterUserId: user.id,
    specialistType: parsed.data.specialistType,
    source: parsed.data.source,
    preferredTimeWindow: parsed.data.preferredTimeWindow,
    locationPreference: parsed.data.locationPreference,
    locationText: parsed.data.locationText,
    postcode: parsed.data.postcode,
    message: parsed.data.message,
    sourceExportId: parsed.data.sourceExportId,
  })

  const locale = coerceSupportedLocale(req.headers.get('x-fairsettle-locale'))
  const requestOrigin = getRequestOrigin(req)
  const adminEmail = process.env.REFERRAL_ADMIN_EMAIL
  const adminUrl = buildAppUrl('/admin/referrals', locale, requestOrigin)
  const caseUrl = buildAppUrl(`/cases/${caseId}/resolution`, locale, requestOrigin)

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  if (adminEmail && process.env.RESEND_API_KEY) {
    await sendReferralAdminEmail({
      adminEmail,
      subject: parsed.data.source === 'mediator_assist'
        ? 'Mediator Assist purchase ready for matching'
        : 'New FairSettle referral request',
      title: parsed.data.source === 'mediator_assist'
        ? 'A paid Mediator Assist request needs matching'
        : 'A parent has requested professional help',
      body: [
        `Case: ${caseId}`,
        `Requester: ${profile?.full_name || user.email || user.id}`,
        `Specialist type: ${parsed.data.specialistType}`,
        `Source: ${parsed.data.source}`,
        parsed.data.preferredTimeWindow ? `Preferred time window: ${parsed.data.preferredTimeWindow}` : null,
        parsed.data.locationPreference ? `Location preference: ${parsed.data.locationPreference}` : null,
        parsed.data.locationText ? `Location: ${parsed.data.locationText}` : null,
        parsed.data.postcode ? `Postcode: ${parsed.data.postcode}` : null,
        parsed.data.message ? `Message: ${parsed.data.message}` : null,
      ].filter(Boolean).join('\n'),
      adminUrl,
    }).catch(() => null)
  }

  if (profile?.email && process.env.RESEND_API_KEY) {
    await sendReferralAcknowledgementEmail({
      userEmail: profile.email,
      title: parsed.data.source === 'mediator_assist'
        ? 'Your Mediator Assist request is in review'
        : 'We have received your professional help request',
      body: parsed.data.source === 'mediator_assist'
        ? 'Your case pack purchase has been recorded and the FairSettle team will now match your case with a suitable mediator.'
        : 'The FairSettle team has received your specialist request and will review the details before matching the case.',
      caseUrl,
    }).catch(() => null)
  }

  return NextResponse.json({ referral_request: referralRequest })
}
