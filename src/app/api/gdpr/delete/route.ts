import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { deleteUserGdprData } from '@/lib/gdpr'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  try {
    const result = await deleteUserGdprData(user.id)

    try {
      await supabase.auth.signOut()
    } catch {}

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return apiError(req, 'SAVE_FAILED', 500)
  }
}
