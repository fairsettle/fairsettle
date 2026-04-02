import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { buildAppUrl, getAppOrigin } from '@/lib/app-url'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'

const checkoutSchema = z.object({
  case_id: z.string().uuid(),
  tier: z.enum(['standard', 'resolution']),
})

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_STANDARD || !process.env.STRIPE_PRICE_RESOLUTION) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }

  try {
    getAppOrigin()
  } catch {
    return NextResponse.json({ error: 'App URL is not configured' }, { status: 500 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = checkoutSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const caseResult = await supabase
    .from('cases')
    .select('*')
    .eq('id', parsed.data.case_id)
    .single()

  if (caseResult.error || !caseResult.data) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  if (caseResult.data.initiator_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (caseResult.data.status === 'expired') {
    return NextResponse.json(
      { error: 'Single-party exports do not require payment' },
      { status: 400 },
    )
  }

  if (!['comparison', 'completed'].includes(caseResult.data.status)) {
    return NextResponse.json({ error: 'Export is not ready yet' }, { status: 409 })
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
      success_url: `${buildAppUrl(`/cases/${parsed.data.case_id}/export`, locale)}?success=true`,
      cancel_url: `${buildAppUrl(`/cases/${parsed.data.case_id}/export`, locale)}?cancelled=true`,
      metadata: {
        caseId: parsed.data.case_id,
        tier: parsed.data.tier,
        userId: user.id,
      },
      customer_email: user.email,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to create checkout session',
      },
      { status: 502 },
    )
  }
}
