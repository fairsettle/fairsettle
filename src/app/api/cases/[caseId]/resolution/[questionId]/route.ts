import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAuthorizedCase } from '@/lib/cases/auth'
import { logEvent } from '@/lib/timeline'

const resolutionDecisionSchema = z
  .object({
    action: z.enum(['accept', 'modify', 'reject']),
    modified_value: z.string().trim().min(1).max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === 'modify' && !value.modified_value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['modified_value'],
        message: 'modified_value is required when action is modify',
      })
    }
  })

export async function PATCH(
  req: Request,
  { params }: { params: { caseId: string; questionId: string } },
) {
  const { user, response } = await getAuthorizedCase(params.caseId)

  if (response) {
    return response
  }
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = resolutionDecisionSchema.safeParse(await req.json())

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const eventType =
    parsed.data.action === 'accept'
      ? 'resolution_accepted'
      : parsed.data.action === 'modify'
        ? 'resolution_modified'
        : 'resolution_rejected'

  await logEvent(params.caseId, eventType, user.id, {
    question_id: params.questionId,
    modified_value: parsed.data.modified_value ?? null,
  })

  return NextResponse.json({ success: true })
}
