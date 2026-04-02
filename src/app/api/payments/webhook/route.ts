import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { sendExportReadyEmail } from '@/lib/email/resend'
import { createStoredFullExport } from '@/lib/exports'
import { stripe } from '@/lib/stripe/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe webhook is not configured' }, { status: 500 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
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

    const profileResult = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileResult.data?.email && process.env.RESEND_API_KEY) {
      await sendExportReadyEmail(
        profileResult.data.email,
        caseId,
        exportRecord.tier,
        profileResult.data.preferred_language || 'en',
      )
    }
  }

  return NextResponse.json({ received: true })
}
