import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { getAuthorizedCase } from '@/lib/cases/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  req: Request,
  { params }: { params: { caseId: string } },
) {
  const { user, response } = await getAuthorizedCase(params.caseId, req)
  if (response) {
    return response
  }
  if (!user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const { data, error } = await supabaseAdmin
    .from('recommendations')
    .select('*, recommendation_responses(*)')
    .eq('case_id', params.caseId)
    .order('created_at', { ascending: false })

  if (error) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  return NextResponse.json({ recommendations: data ?? [], viewer_user_id: user.id })
}
