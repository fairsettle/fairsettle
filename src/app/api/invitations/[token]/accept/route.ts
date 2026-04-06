import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { acceptInvitationToken } from '@/lib/invitations'

export async function POST(
  req: Request,
  { params }: { params: { token: string } },
) {
  const result = await acceptInvitationToken(params.token)

  if (!result.success) {
    if (result.reason === 'unauthorized') {
      return apiError(req, 'UNAUTHORIZED', 401)
    }

    if (result.reason === 'own_case') {
      return apiError(req, 'SELF_INVITE_NOT_ALLOWED', 400)
    }

    if (result.reason === 'not_found' || result.reason === 'expired') {
      return apiError(req, 'INVITATION_NOT_FOUND', 404)
    }

    return apiError(req, 'INVITATION_ALREADY_ACCEPTED', 409)
  }

  return NextResponse.json({ success: true, case_id: result.caseId })
}
