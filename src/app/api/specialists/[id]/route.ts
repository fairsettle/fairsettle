import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { getSpecialistById } from '@/lib/referrals/service'

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const specialist = await getSpecialistById(params.id)
    if (!specialist) {
      return apiError(req, 'CASE_NOT_FOUND', 404)
    }

    return NextResponse.json({ specialist })
  } catch {
    return apiError(req, 'FETCH_FAILED', 400)
  }
}
