import { NextResponse } from 'next/server'

import { validateInvitationToken } from '@/lib/invitations'

export async function GET(
  _req: Request,
  { params }: { params: { token: string } },
) {
  const validation = await validateInvitationToken(params.token)

  if (!validation.valid) {
    return NextResponse.json({ valid: false, reason: validation.reason })
  }

  return NextResponse.json({
    valid: true,
    case_type: validation.caseItem.case_type,
    message: 'Invitation is valid',
  })
}
