import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const { data, error } = await supabaseAdmin
    .from('referrals')
    .select('*, specialists(*), recommendations(*), referral_requests(*)')
    .eq('id', params.id)
    .maybeSingle()

  if (error) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  if (!data) {
    return apiError(req, 'CASE_NOT_FOUND', 404)
  }

  return NextResponse.json({ referral: data })
}
