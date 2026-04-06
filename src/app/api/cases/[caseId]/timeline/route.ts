import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { getAuthorizedCase } from '@/lib/cases/auth'

export async function GET(
  req: Request,
  { params }: { params: { caseId: string } },
) {
  const { supabase, caseItem, response } = await getAuthorizedCase(params.caseId, req)

  if (response) {
    return response
  }
  if (!caseItem) {
    return apiError(req, 'CASE_NOT_FOUND', 404)
  }

  const { data: timelineItems, error: timelineError } = await supabase
    .from('case_timeline')
    .select('event_type, event_data, created_at')
    .eq('case_id', params.caseId)
    .order('created_at', { ascending: true })

  if (timelineError) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  return NextResponse.json({
    events: (timelineItems ?? []).map((item) => ({
      event_type: item.event_type,
      event_data: item.event_data,
      created_at: item.created_at,
      display_time: new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(new Date(item.created_at)),
    })),
  })
}
