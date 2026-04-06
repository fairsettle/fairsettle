import { NextResponse } from 'next/server'

import { getApiErrorPayload } from '@/lib/api-errors'
import { validateInvitationToken } from '@/lib/invitations'

export async function GET(
  req: Request,
  { params }: { params: { token: string } },
) {
  const validation = await validateInvitationToken(params.token)

  if (!validation.valid) {
    let code: 'INVITATION_NOT_FOUND' | 'INVITATION_ALREADY_ACCEPTED'
    let status: 404 | 409

    switch (validation.reason) {
      case 'not_found':
      case 'expired':
        code = 'INVITATION_NOT_FOUND'
        status = 404
        break
      case 'already_accepted':
      default:
        code = 'INVITATION_ALREADY_ACCEPTED'
        status = 409
        break
    }

    return NextResponse.json({
      valid: false,
      reason: validation.reason,
      error: await getApiErrorPayload(req, code, status),
    })
  }

  return NextResponse.json({
    valid: true,
    case_type: validation.caseItem.case_type,
    message: 'Invitation is valid',
  })
}
