import { NextResponse } from 'next/server'

import { getRequestOrigin } from '@/lib/app-url'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL('/', getRequestOrigin(req)))
}
