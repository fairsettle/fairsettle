import { apiError, mapAuthErrorCode } from '@/lib/api-errors'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { email, password } = await req.json()
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return apiError(req, mapAuthErrorCode(error.message), 401)
  }

  return Response.json({ user: { id: data.user.id, email: data.user.email } })
}
