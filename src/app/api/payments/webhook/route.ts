import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { apiError } from '@/lib/api-errors'
import { buildAppUrl, getRequestOrigin } from '@/lib/app-url'
import {
  sendExportReadyEmail,
  sendExportReadyNoticeEmail,
  sendReferralAcknowledgementEmail,
  sendReferralAdminEmail,
} from '@/lib/email/resend'
import { createStoredFullExport } from '@/lib/exports'
import { syncSpecialistStripeStatusByAccountId } from '@/lib/professional/stripe'
import { createReferral, createReferralRequest } from '@/lib/referrals/service'
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
    const tier = session.metadata?.tier as 'standard' | 'resolution' | 'mediator_assist' | undefined
    const userId = session.metadata?.userId
    const specialistId = session.metadata?.specialistId
    const paymentModel = session.metadata?.paymentModel

    if (caseId && userId && specialistId && paymentModel === 'connect_checkout') {
      const existingReferral = await supabaseAdmin
        .from('referrals')
        .select('id')
        .eq('stripe_checkout_session_id', session.id)
        .maybeSingle()

      if (!existingReferral.data) {
        const amountPence = Number(session.amount_total ?? 0)
        const commissionBps = Number(session.metadata?.commissionBps ?? '1200')
        const platformFeePence = Math.round(amountPence * (commissionBps / 10000))
        const payoutPence = Math.max(amountPence - platformFeePence, 0)

        try {
          await createReferral({
            caseId,
            referralRequestId: session.metadata?.referralRequestId || null,
            specialistId,
            requestedByUserId: userId,
            source: 'marketplace',
            paymentModel: 'connect_checkout',
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === 'string' ? session.payment_intent : null,
            paymentAmount: amountPence / 100,
            platformFeeAmount: platformFeePence / 100,
            specialistPayoutAmount: payoutPence / 100,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : ''
          if (!message.includes('referrals_stripe_checkout_session_id_key')) {
            throw error
          }
        }
      }

      return NextResponse.json({ received: true })
    }

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

    if (tier === 'mediator_assist') {
      const initiatorLocale = initiatorProfileResult.data?.preferred_language || 'en'
      const referralRequest = await createReferralRequest({
        caseId,
        requesterUserId: userId,
        specialistType: 'mediator',
        source: 'mediator_assist',
        preferredTimeWindow: '',
        locationPreference: 'either',
        locationText: '',
        postcode: '',
        message: 'Created automatically from a paid Mediator Assist purchase.',
        sourceExportId: exportRecord.id,
      }).catch(() => null)

      const adminEmail = process.env.REFERRAL_ADMIN_EMAIL
      if (adminEmail && process.env.RESEND_API_KEY && referralRequest) {
        await sendReferralAdminEmail({
          adminEmail,
          subject: 'Mediator Assist purchase ready for matching',
          title: 'A paid Mediator Assist request needs review',
          body: `Case: ${caseId}\nReferral request: ${referralRequest.id}\nExport tier: mediator_assist`,
          adminUrl: buildAppUrl('/admin/referrals', 'en', getRequestOrigin(req)),
        }).catch(() => null)
      }

      if (initiatorProfileResult.data?.email && process.env.RESEND_API_KEY) {
        await sendReferralAcknowledgementEmail({
          userEmail: initiatorProfileResult.data.email,
          title: 'Your Mediator Assist request is in review',
          body: 'Your export and mediator assist purchase are complete. The FairSettle team will now review your case and start the matching process.',
          caseUrl: buildAppUrl(`/cases/${caseId}/export`, initiatorLocale, getRequestOrigin(req)),
        }).catch(() => null)
      }
    }
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account
    if (account.id) {
      await syncSpecialistStripeStatusByAccountId(account.id).catch(() => null)
    }

    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}
