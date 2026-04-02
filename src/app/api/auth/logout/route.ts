import { NextResponse } from 'next/server'

import { getAppOrigin } from '@/lib/app-url'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL('/', getAppOrigin()))
}
