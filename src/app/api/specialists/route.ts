import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { listMarketplaceSpecialists } from '@/lib/referrals/service'

export async function GET(req: Request) {
  const url = new URL(req.url)

  try {
    const specialists = await listMarketplaceSpecialists({
      specialistType: (url.searchParams.get('type') as 'mediator' | 'solicitor' | 'all' | null) ?? 'all',
      language: url.searchParams.get('language') ?? 'all',
      specialism: url.searchParams.get('specialism') ?? undefined,
      remoteOnly: url.searchParams.get('remote') === 'true',
      postcode: url.searchParams.get('postcode') ?? undefined,
      nextAvailableOnly: url.searchParams.get('nextAvailable') === 'true',
    })

    return NextResponse.json({ specialists })
  } catch {
    return apiError(req, 'FETCH_FAILED', 400)
  }
}
