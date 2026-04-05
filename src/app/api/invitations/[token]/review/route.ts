import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getInvitationByToken, getResponderReviewItems } from '@/lib/invitations'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/timeline'

const reviewSchema = z.object({
  items: z.array(
    z.object({
      question_id: z.string().uuid(),
      action: z.enum(['agree', 'disagree', 'counter']),
      counter_text: z.string().max(500).optional(),
    }),
  ),
})

export async function POST(
  req: Request,
  { params }: { params: { token: string } },
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = reviewSchema.safeParse(await req.json())

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { invitation, caseItem } = await getInvitationByToken(params.token)

  if (!invitation || !caseItem || caseItem.responder_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const expectedReviewItems = await getResponderReviewItems(caseItem.id)

  if (expectedReviewItems.length === 0) {
    return NextResponse.json({ error: 'No review items available for this invitation' }, { status: 409 })
  }

  const expectedQuestionIds = new Set(expectedReviewItems.map((item) => item.question_id))
  const submittedQuestionIds = new Set(parsed.data.items.map((item) => item.question_id))

  const hasUnexpectedItems = parsed.data.items.some(
    (item) =>
      !expectedQuestionIds.has(item.question_id) ||
      (item.action === 'counter' && !item.counter_text?.trim()),
  )

  if (hasUnexpectedItems || submittedQuestionIds.size !== expectedQuestionIds.size) {
    return NextResponse.json({ error: 'Review submission does not match the invitation items' }, { status: 400 })
  }

  await logEvent(caseItem.id, 'responder_completed', user.id, {
    review_items: parsed.data.items,
  })

  return NextResponse.json({ success: true, case_id: caseItem.id })
}
