import { NextResponse } from 'next/server'

import { apiError, mapAuthErrorCode } from '@/lib/api-errors'
import { coerceSupportedLocale } from '@/lib/locale-path'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { email, password } = await req.json()
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return apiError(req, mapAuthErrorCode(error.message), 401)
  }

  const profileResult = await supabase
    .from('profiles')
    .select('preferred_language, is_admin')
    .eq('id', data.user.id)
    .maybeSingle()
  const specialistResult = await supabase
    .from('specialists')
    .select('id')
    .eq('profile_id', data.user.id)
    .eq('is_active', true)
    .eq('is_verified', true)
    .maybeSingle()

  const preferredLanguage = coerceSupportedLocale(
    profileResult.data?.preferred_language ||
      (typeof data.user.user_metadata?.preferred_language === 'string'
        ? data.user.user_metadata.preferred_language
        : null),
  )

  const response = NextResponse.json({
    user: { id: data.user.id, email: data.user.email },
    is_admin: Boolean(profileResult.data?.is_admin),
    is_specialist: Boolean(specialistResult.data?.id),
    preferred_language: preferredLanguage,
  })

  response.cookies.set('NEXT_LOCALE', preferredLanguage, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  return response
}
