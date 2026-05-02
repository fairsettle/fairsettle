import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { data, error } = await supabaseAdmin
    .from('specialist_ratings')
    .select('*')
    .eq('specialist_id', params.id)
    .order('created_at', { ascending: false })

  if (error) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  return NextResponse.json({ ratings: data ?? [] })
}
