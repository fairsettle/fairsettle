import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api-errors'
import { buildAppUrl, getAppOrigin, getRequestOrigin } from '@/lib/app-url'
import { getAuthorizedCase } from '@/lib/cases/auth'
import { syncSpecialistStripeStatus } from '@/lib/professional/stripe'
import { createReferral } from '@/lib/referrals/service'
import { stripe } from '@/lib/stripe/server'

const specialistCheckoutSchema = z.object({
  caseId: z.string().uuid(),
  specialistId: z.string().uuid(),
  referralRequestId: z.string().uuid().nullable().optional(),
  specialistType: z.enum(['mediator', 'solicitor']),
  amountPence: z.number().int().positive(),
})

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return apiError(req, 'STRIPE_NOT_CONFIGURED', 500)
  }

  const requestOrigin = getRequestOrigin(req)
  try {
    getAppOrigin(requestOrigin)
  } catch {
    return apiError(req, 'APP_URL_NOT_CONFIGURED', 500)
  }

  const parsed = specialistCheckoutSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, { details: parsed.error.issues })
  }

  const { supabase, user, response } = await getAuthorizedCase(parsed.data.caseId, req)
  if (response) {
    return response
  }
  if (!user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const { data: specialist } = await supabase
    .from('specialists')
    .select('stripe_connect_id, full_name, specialist_type')
    .eq('id', parsed.data.specialistId)
    .maybeSingle()

  if (!specialist) {
    return apiError(req, 'FETCH_FAILED', 404)
  }

  if (specialist.specialist_type !== parsed.data.specialistType) {
    return apiError(req, 'VALIDATION_FAILED', 400, {
      details: 'Selected specialist type does not match the chosen professional profile.',
    })
  }

  if (parsed.data.specialistType === 'solicitor') {
    const referral = await createReferral({
      caseId: parsed.data.caseId,
      referralRequestId: parsed.data.referralRequestId ?? null,
      specialistId: parsed.data.specialistId,
      requestedByUserId: user.id,
      source: 'marketplace',
      paymentModel: 'solicitor_off_platform',
    })

    return NextResponse.json({ referral, off_platform: true })
  }

  if (!specialist?.stripe_connect_id) {
    return apiError(req, 'STRIPE_NOT_CONFIGURED', 409, {
      details:
        'This specialist has not completed Stripe onboarding yet, so marketplace checkout is not available right now.',
    })
  }

  const stripeSnapshot = await syncSpecialistStripeStatus(parsed.data.specialistId)
  if (stripeSnapshot.status !== 'completed') {
    return apiError(req, 'STRIPE_NOT_CONFIGURED', 409, {
      details:
        stripeSnapshot.detail ||
        'This specialist cannot receive marketplace payouts yet. Please ask them to complete Stripe verification first.',
    })
  }

  const commissionBps = Number(process.env.SPECIALIST_MARKETPLACE_COMMISSION_BPS ?? '1200')
  const applicationFeeAmount = Math.round(parsed.data.amountPence * (commissionBps / 10000))
  const locale = cookies().get('NEXT_LOCALE')?.value || 'en'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `${specialist.full_name} specialist session`,
            },
            unit_amount: parsed.data.amountPence,
          },
          quantity: 1,
        },
      ],
      success_url: `${buildAppUrl(`/specialists/${parsed.data.specialistId}`, locale, requestOrigin)}?booking=success`,
      cancel_url: `${buildAppUrl(`/specialists/${parsed.data.specialistId}`, locale, requestOrigin)}?booking=cancelled`,
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: specialist.stripe_connect_id,
        },
        metadata: {
          caseId: parsed.data.caseId,
          specialistId: parsed.data.specialistId,
          referralRequestId: parsed.data.referralRequestId ?? '',
          userId: user.id,
          paymentModel: 'connect_checkout',
          commissionBps: String(commissionBps),
        },
      },
      metadata: {
        caseId: parsed.data.caseId,
        specialistId: parsed.data.specialistId,
        referralRequestId: parsed.data.referralRequestId ?? '',
        userId: user.id,
        specialistType: parsed.data.specialistType,
        paymentModel: 'connect_checkout',
        commissionBps: String(commissionBps),
      },
      customer_email: user.email,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const details =
      typeof error === 'object' &&
      error !== null &&
      'raw' in error &&
      typeof (error as { raw?: { message?: unknown } }).raw?.message === 'string'
        ? (error as { raw: { message: string } }).raw.message
        : error instanceof Error
          ? error.message
          : 'Unable to create the specialist checkout session.'

    return apiError(req, 'CHECKOUT_CREATION_FAILED', 502, { details })
  }
}
