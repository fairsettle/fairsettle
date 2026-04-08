import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { getAuthorizedCase } from '@/lib/cases/auth'
import { getResolutionPayload } from '@/lib/ai/resolution'
import { coerceSupportedLocale } from '@/lib/locale-path'

export async function GET(
  req: Request,
  { params }: { params: { caseId: string } },
) {
  const { user, caseItem, response } = await getAuthorizedCase(params.caseId, req)

  if (response) {
    return response
  }
  if (!user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }
  if (!caseItem) {
    return apiError(req, 'CASE_NOT_FOUND', 404)
  }

  if (!caseItem.responder_id) {
    return apiError(req, 'RESOLUTION_NOT_READY', 409)
  }

  try {
    const locale = coerceSupportedLocale(new URL(req.url).searchParams.get('locale'))
    const payload = await getResolutionPayload({
      caseId: params.caseId,
      viewerUserId: user.id,
      locale,
    })
    return NextResponse.json(payload)
  } catch (error) {
    return apiError(req, 'FETCH_FAILED', 400)
  }
}
