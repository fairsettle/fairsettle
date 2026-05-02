import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api-errors'
import { buildAppUrl, getRequestOrigin } from '@/lib/app-url'
import { sendDirectEmail } from '@/lib/email/resend'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { submitRecommendation } from '@/lib/referrals/service'

const recommendationSchema = z.object({
  referralId: z.string().uuid(),
  caseId: z.string().uuid(),
  items: z.array(
    z.object({
      item_key: z.string().min(1),
      question_id: z.string().uuid(),
      child_id: z.string().uuid().nullable().optional(),
      question_label: z.string().min(1).optional(),
      recommended_stance: z.enum(['agree_with_party_a', 'agree_with_party_b', 'alternative']),
      recommended_value: z.any().nullable(),
      reasoning: z.string().min(1),
    }),
  ).min(1),
  overallAssessment: z.string().min(1),
  nextStepsRecommendation: z.enum([
    'accept_suggestions',
    'modify_positions',
    'book_follow_up',
    'seek_mediation',
    'seek_solicitor_support',
    'court_pack_ready',
  ]),
  safeguardingFlag: z.boolean(),
  safeguardingNotes: z.string().max(2000).optional(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const parsed = recommendationSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, { details: parsed.error.issues })
  }

  const { data: specialist } = await supabase
    .from('specialists')
    .select('id')
    .eq('profile_id', user.id)
    .eq('is_verified', true)
    .eq('is_active', true)
    .maybeSingle()

  if (!specialist) {
    return apiError(req, 'FORBIDDEN', 403)
  }

  const { data: referral } = await supabaseAdmin
    .from('referrals')
    .select('id')
    .eq('id', parsed.data.referralId)
    .eq('case_id', parsed.data.caseId)
    .eq('specialist_id', specialist.id)
    .maybeSingle()

  if (!referral) {
    return apiError(req, 'FORBIDDEN', 403)
  }

  try {
    const recommendation = await submitRecommendation({
      referralId: parsed.data.referralId,
      caseId: parsed.data.caseId,
      specialistId: specialist.id,
      items: parsed.data.items,
      overallAssessment: parsed.data.overallAssessment,
      nextStepsRecommendation: parsed.data.nextStepsRecommendation,
      safeguardingFlag: parsed.data.safeguardingFlag,
      safeguardingNotes: parsed.data.safeguardingNotes,
    })

    if (process.env.RESEND_API_KEY) {
      const { data: caseRow } = await supabaseAdmin
        .from('cases')
        .select('initiator_id, responder_id')
        .eq('id', parsed.data.caseId)
        .maybeSingle()

      const participantIds = [caseRow?.initiator_id, caseRow?.responder_id].filter(Boolean) as string[]
      const { data: profiles } = participantIds.length
        ? await supabaseAdmin
            .from('profiles')
            .select('email, preferred_language')
            .in('id', participantIds)
        : { data: [] }

      const requestOrigin = getRequestOrigin(req)
      for (const profile of profiles ?? []) {
        if (!profile.email) {
          continue
        }

        await sendDirectEmail({
          to: profile.email,
          subject: 'A FairSettle professional recommendation is ready',
          title: 'A specialist recommendation is ready for review',
          body: 'A specialist has submitted a recommendation for your case. Open the resolution page to accept, modify, or reject each suggested item.',
          ctaLabel: 'Open case',
          ctaUrl: buildAppUrl(
            `/cases/${parsed.data.caseId}/resolution`,
            profile.preferred_language || 'en',
            requestOrigin,
          ),
        }).catch(() => null)
      }
    }

    return NextResponse.json({ recommendation })
  } catch {
    return apiError(req, 'SAVE_FAILED', 400)
  }
}
