import { apiError } from '@/lib/api-errors'
import { markSentimentFlagReviewed } from '@/lib/admin/sentiment'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    return apiError(req, 'FORBIDDEN', 403)
  }

  const { error } = await markSentimentFlagReviewed(params.id, user.id)

  if (error) {
    return apiError(req, 'SAVE_FAILED', 400)
  }

  return Response.json({ ok: true })
}
