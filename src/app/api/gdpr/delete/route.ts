import { NextResponse } from 'next/server'

import { deleteUserGdprData } from '@/lib/gdpr'
import { createClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await deleteUserGdprData(user.id)

    try {
      await supabase.auth.signOut()
    } catch {}

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to delete user data',
      },
      { status: 500 },
    )
  }
}
