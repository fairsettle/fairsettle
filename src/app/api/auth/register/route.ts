import { NextResponse } from 'next/server'
import { z } from 'zod'

import { buildAppUrl, getRequestOrigin } from '@/lib/app-url'
import { createClient } from '@/lib/supabase/server'

const registerSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  preferred_language: z.enum(['en', 'pl', 'ro', 'ar']).default('en'),
  children_count: z.number().int().min(0).max(20),
  privacy_consent: z.literal(true),
})

export async function POST(req: Request) {
  const requestOrigin = getRequestOrigin(req)
  const body = await req.json()
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const {
    full_name,
    email,
    password,
    preferred_language,
    children_count,
    privacy_consent,
  } = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        preferred_language,
        children_count,
        privacy_consent,
      },
      emailRedirectTo: buildAppUrl('/api/auth/callback', undefined, requestOrigin),
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    requires_email_confirmation: !data.session,
    user: {
      id: data.user?.id,
      email: data.user?.email,
    },
  })
}
