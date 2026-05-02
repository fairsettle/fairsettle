import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { coerceSupportedLocale, strictLocalizeHref } from '@/lib/locale-path'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const profileResult = user
        ? await supabase
            .from('profiles')
            .select('preferred_language, is_admin')
            .eq('id', user.id)
            .maybeSingle()
        : { data: null }
      const specialistResult = user
        ? await supabase
            .from('specialists')
            .select('id')
            .eq('profile_id', user.id)
            .eq('is_active', true)
            .eq('is_verified', true)
            .maybeSingle()
        : { data: null }

      const preferredLanguage = coerceSupportedLocale(
        profileResult.data?.preferred_language ||
          (typeof user?.user_metadata?.preferred_language === 'string'
            ? user.user_metadata.preferred_language
            : null),
      )

      const nextDestination =
        profileResult.data?.is_admin && (next === '/' || next === '/dashboard')
          ? '/admin'
          : specialistResult.data?.id && (next === '/' || next === '/dashboard')
            ? '/professional/dashboard'
          : next

      const response = NextResponse.redirect(
        `${origin}${strictLocalizeHref(preferredLanguage, nextDestination)}`,
      )

      response.cookies.set('NEXT_LOCALE', preferredLanguage, {
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      })

      return response
    }
  }

  return NextResponse.redirect(`${origin}/en/login?error=auth_callback_failed`)
}
