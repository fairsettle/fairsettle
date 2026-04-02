import { NextResponse } from 'next/server'

import { getAuthorizedCase } from '@/lib/cases/auth'

export async function GET(
  _req: Request,
  { params }: { params: { caseId: string } },
) {
  const { supabase, caseItem, response } = await getAuthorizedCase(params.caseId)

  if (response) {
    return response
  }
  if (!caseItem) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  const { data: timelineItems, error: timelineError } = await supabase
    .from('case_timeline')
    .select('event_type, event_data, created_at')
    .eq('case_id', params.caseId)
    .order('created_at', { ascending: true })

  if (timelineError) {
    return NextResponse.json({ error: timelineError.message }, { status: 400 })
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
