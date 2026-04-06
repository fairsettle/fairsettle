import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { apiError } from '@/lib/api-errors'
import { getRequestOrigin } from '@/lib/app-url'
import { sendExportReadyEmail, sendExportReadyNoticeEmail } from '@/lib/email/resend'
import { createStoredFullExport } from '@/lib/exports'
import { stripe } from '@/lib/stripe/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return apiError(req, 'STRIPE_NOT_CONFIGURED', 500)
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return apiError(req, 'SIGNATURE_MISSING', 400)
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch {
    return apiError(req, 'SIGNATURE_INVALID', 400)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const caseId = session.metadata?.caseId
    const tier = session.metadata?.tier as 'standard' | 'resolution' | undefined
    const userId = session.metadata?.userId

    if (!caseId || !tier || !userId) {
      return NextResponse.json({ received: true })
    }

    const exportRecord = await createStoredFullExport({
      caseId,
      tier,
      userId,
      stripeSessionId: session.id,
    })

    const [initiatorProfileResult, responderProfileResult] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      supabaseAdmin
        .from('cases')
        .select('responder_id')
        .eq('id', caseId)
        .maybeSingle()
        .then(async ({ data }) => {
          if (!data?.responder_id) {
            return { data: null }
          }

          return await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', data.responder_id)
            .maybeSingle()
        }),
    ])

    if (initiatorProfileResult.data?.email && process.env.RESEND_API_KEY) {
      await sendExportReadyEmail(
        initiatorProfileResult.data.email,
        caseId,
        exportRecord.tier,
        initiatorProfileResult.data.preferred_language || 'en',
        getRequestOrigin(req),
      )
    }

    if (responderProfileResult.data?.email && process.env.RESEND_API_KEY) {
      await sendExportReadyNoticeEmail(
        responderProfileResult.data.email,
        caseId,
        responderProfileResult.data.preferred_language || 'en',
        getRequestOrigin(req),
      )
    }
  }

  return NextResponse.json({ received: true })
}
