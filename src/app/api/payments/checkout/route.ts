import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { buildAppUrl, getAppOrigin, getRequestOrigin } from '@/lib/app-url'
import { apiError } from '@/lib/api-errors'
import { isExportUnlocked } from '@/lib/cases/export-gating'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'

const checkoutSchema = z.object({
  case_id: z.string().uuid(),
  tier: z.enum(['standard', 'resolution']),
})

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_STANDARD || !process.env.STRIPE_PRICE_RESOLUTION) {
    return apiError(req, 'STRIPE_NOT_CONFIGURED', 500)
  }

  const requestOrigin = getRequestOrigin(req)

  try {
    getAppOrigin(requestOrigin)
  } catch {
    return apiError(req, 'APP_URL_NOT_CONFIGURED', 500)
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const body = await req.json()
  const parsed = checkoutSchema.safeParse(body)

  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, {
      details: parsed.error.issues,
    })
  }

  const caseResult = await supabase
    .from('cases')
    .select('*')
    .eq('id', parsed.data.case_id)
    .single()

  if (caseResult.error || !caseResult.data) {
    return apiError(req, 'CASE_NOT_FOUND', 404)
  }

  if (caseResult.data.initiator_id !== user.id) {
    return apiError(req, 'EXPORT_INITIATOR_ONLY', 403)
  }

  if (caseResult.data.status === 'expired') {
    return apiError(req, 'EXPORT_SINGLE_PARTY_FREE', 400)
  }

  if (!['comparison', 'completed', 'expired'].includes(caseResult.data.status)) {
    return apiError(req, 'EXPORT_NOT_READY', 409)
  }

  if (!isExportUnlocked(caseResult.data)) {
    return apiError(req, 'EXPORT_UNLOCK_REQUIRES_CONFIRMATION', 409)
  }

  const locale = cookies().get('NEXT_LOCALE')?.value || 'en'
  const priceId =
    parsed.data.tier === 'standard'
      ? process.env.STRIPE_PRICE_STANDARD
      : process.env.STRIPE_PRICE_RESOLUTION

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${buildAppUrl(`/cases/${parsed.data.case_id}/export`, locale, requestOrigin)}?success=true`,
      cancel_url: `${buildAppUrl(`/cases/${parsed.data.case_id}/export`, locale, requestOrigin)}?cancelled=true`,
      metadata: {
        caseId: parsed.data.case_id,
        tier: parsed.data.tier,
        userId: user.id,
      },
      customer_email: user.email,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    return apiError(req, 'CHECKOUT_CREATION_FAILED', 502)
  }
}
