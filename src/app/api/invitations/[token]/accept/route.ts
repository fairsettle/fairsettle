import { NextResponse } from 'next/server'

import { acceptInvitationToken } from '@/lib/invitations'

export async function POST(
  _req: Request,
  { params }: { params: { token: string } },
) {
  const result = await acceptInvitationToken(params.token)

  if (!result.success) {
    const status =
      result.reason === 'unauthorized'
        ? 401
        : result.reason === 'own_case'
          ? 400
          : result.reason === 'not_found' || result.reason === 'expired'
            ? 404
            : 409

    return NextResponse.json({ error: result.reason }, { status })
  }

  return NextResponse.json({ success: true, case_id: result.caseId })
}
