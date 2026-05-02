import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api-errors'
import { buildAppUrl, getRequestOrigin } from '@/lib/app-url'
import { sendDirectEmail } from '@/lib/email/resend'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { scheduleReferral } from '@/lib/referrals/service'

const scheduleSchema = z.object({
  status: z.enum(['accepted', 'session_scheduled', 'completed', 'cancelled']),
  scheduledFor: z.string().datetime().nullable().optional(),
  meetingMode: z.enum(['video', 'phone', 'in_person']).nullable().optional(),
  meetingLink: z.string().url().nullable().optional(),
  meetingInstructions: z.string().max(2000).nullable().optional(),
})

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const [{ data: specialist }, { data: referral }] = await Promise.all([
    supabaseAdmin
      .from('specialists')
      .select('id')
      .eq('profile_id', user.id)
      .eq('is_verified', true)
      .eq('is_active', true)
      .maybeSingle(),
    supabaseAdmin
      .from('referrals')
      .select('id, specialist_id')
      .eq('id', params.id)
      .maybeSingle(),
  ])

  if (!specialist || !referral || referral.specialist_id !== specialist.id) {
    return apiError(req, 'FORBIDDEN', 403)
  }

  const parsed = scheduleSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, { details: parsed.error.issues })
  }

  try {
    const referral = await scheduleReferral({
      referralId: params.id,
      status: parsed.data.status,
      scheduledFor: parsed.data.scheduledFor ?? undefined,
      meetingMode: parsed.data.meetingMode ?? undefined,
      meetingLink: parsed.data.meetingLink ?? undefined,
      meetingInstructions: parsed.data.meetingInstructions ?? undefined,
    })

    if (process.env.RESEND_API_KEY && ['accepted', 'session_scheduled'].includes(parsed.data.status)) {
      const [{ data: referralContext }, { data: caseRow }, { data: specialistProfile }] = await Promise.all([
        supabaseAdmin
          .from('referrals')
          .select('case_id, scheduled_for, meeting_mode, meeting_link, meeting_instructions')
          .eq('id', params.id)
          .maybeSingle(),
        supabaseAdmin
          .from('cases')
          .select('initiator_id, responder_id')
          .eq('id', referral.case_id)
          .maybeSingle(),
        supabaseAdmin
          .from('specialists')
          .select('email, full_name')
          .eq('id', specialist.id)
          .maybeSingle(),
      ])

      const participantIds = [caseRow?.initiator_id, caseRow?.responder_id].filter(Boolean) as string[]
      const { data: profiles } = participantIds.length
        ? await supabaseAdmin
            .from('profiles')
            .select('email, preferred_language')
            .in('id', participantIds)
        : { data: [] }

      const requestOrigin = getRequestOrigin(req)
      const scheduleSummary =
        referralContext?.scheduled_for && referralContext?.meeting_mode
          ? `Scheduled for ${new Date(referralContext.scheduled_for).toLocaleString()} via ${referralContext.meeting_mode.replace('_', ' ')}.`
          : 'The specialist has updated the referral status.'
      const participantTitle =
        parsed.data.status === 'accepted'
          ? 'Your specialist referral has been accepted'
          : 'Your specialist session has been scheduled'
      const participantBody =
        parsed.data.status === 'accepted'
          ? 'A specialist has accepted your FairSettle referral and will now move the case into the next scheduling stage.'
          : `${scheduleSummary}${referralContext?.meeting_link ? ` Meeting link: ${referralContext.meeting_link}` : ''}${referralContext?.meeting_instructions ? ` Instructions: ${referralContext.meeting_instructions}` : ''}`

      for (const profile of profiles ?? []) {
        if (!profile.email) {
          continue
        }

        await sendDirectEmail({
          to: profile.email,
          subject: participantTitle,
          title: participantTitle,
          body: participantBody,
          ctaLabel: 'Open case',
          ctaUrl: buildAppUrl(
            `/cases/${referral.case_id}/resolution`,
            profile.preferred_language || 'en',
            requestOrigin,
          ),
        }).catch(() => null)
      }

      if (specialistProfile?.email) {
        await sendDirectEmail({
          to: specialistProfile.email,
          subject:
            parsed.data.status === 'accepted'
              ? 'You accepted a FairSettle referral'
              : 'Your FairSettle session schedule is saved',
          title:
            parsed.data.status === 'accepted'
              ? 'Referral acceptance saved'
              : 'Session scheduling saved',
          body:
            parsed.data.status === 'accepted'
              ? 'The referral is now marked as accepted in FairSettle.'
              : `${scheduleSummary}${referralContext?.meeting_instructions ? ` Instructions: ${referralContext.meeting_instructions}` : ''}`,
          ctaLabel: 'Open specialist dashboard',
          ctaUrl: buildAppUrl('/professional/dashboard', 'en', requestOrigin),
        }).catch(() => null)
      }
    }

    return NextResponse.json({ referral })
  } catch {
    return apiError(req, 'SAVE_FAILED', 400)
  }
}
