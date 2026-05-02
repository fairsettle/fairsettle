import { createServerClient } from '@supabase/ssr'
import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { routing } from '@/i18n/routing'
import {
  coerceSupportedLocale,
  getLocaleFromPathname,
  getStrictLocalizedPath,
  stripLocaleFromPathname,
} from '@/lib/locale-path'

const intlMiddleware = createIntlMiddleware(routing)

function createSupabaseMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )
}

export async function middleware(request: NextRequest) {
  const protectedPaths = ['/dashboard', '/cases', '/respond']
  const pathname = request.nextUrl.pathname
  const pathnameWithoutLocale = stripLocaleFromPathname(pathname)
  const routeLocale = getLocaleFromPathname(pathname)
  const isProtected = protectedPaths.some((path) => pathname.includes(path))
  const isAdminRoute = pathnameWithoutLocale === '/admin' || pathnameWithoutLocale.startsWith('/admin/')
  const isProfessionalRoute =
    pathnameWithoutLocale === '/professional' ||
    pathnameWithoutLocale.startsWith('/professional/')
  const isProfessionalApplyRoute = pathnameWithoutLocale === '/professional/apply'
  const isInviteEntry = /\/respond\/[a-f0-9]{64}$/.test(pathname)

  if (isAdminRoute || (isProfessionalRoute && !isProfessionalApplyRoute)) {
    const adminResponse = NextResponse.next()
    const supabase = createSupabaseMiddlewareClient(request, adminResponse)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const adminLocale = routeLocale ?? routing.defaultLocale

    if (!user) {
      const loginUrl = new URL(getStrictLocalizedPath(adminLocale, '/login'), request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const [profileResult, specialistResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('preferred_language, is_admin')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('specialists')
        .select('id')
        .eq('profile_id', user.id)
        .eq('is_active', true)
        .eq('is_verified', true)
        .maybeSingle(),
    ])

    const preferredLocale = coerceSupportedLocale(
      profileResult.data?.preferred_language ||
        (typeof user.user_metadata?.preferred_language === 'string'
          ? user.user_metadata.preferred_language
          : null),
    )

    const isSpecialist = Boolean(specialistResult.data?.id)

    if (isAdminRoute && !profileResult.data?.is_admin) {
      return NextResponse.redirect(
        new URL(getStrictLocalizedPath(preferredLocale, '/dashboard'), request.url),
      )
    }

    if (isProfessionalRoute && !isProfessionalApplyRoute && !isSpecialist) {
      return NextResponse.redirect(
        new URL(getStrictLocalizedPath(preferredLocale, '/dashboard'), request.url),
      )
    }

    adminResponse.cookies.set('NEXT_LOCALE', preferredLocale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    })

    return adminResponse
  }

  const intlResponse = intlMiddleware(request)
  const supabase = createSupabaseMiddlewareClient(request, intlResponse)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isProtected && !isInviteEntry && !user) {
    const loginUrl = new URL(
      getStrictLocalizedPath(routeLocale ?? routing.defaultLocale, '/login'),
      request.url,
    )
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user) {
    const [profileResult, specialistResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('preferred_language, is_admin')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('specialists')
        .select('id')
        .eq('profile_id', user.id)
        .eq('is_active', true)
        .eq('is_verified', true)
        .maybeSingle(),
    ])

    const preferredLocale = coerceSupportedLocale(
      profileResult.data?.preferred_language ||
        (typeof user.user_metadata?.preferred_language === 'string'
          ? user.user_metadata.preferred_language
          : null),
    )

    const effectiveLocale = routeLocale ?? routing.defaultLocale
    const isAdmin = Boolean(profileResult.data?.is_admin)
    const isSpecialist = Boolean(specialistResult.data?.id)

    if (
      effectiveLocale !== preferredLocale &&
      pathnameWithoutLocale !== '/api/auth/callback'
    ) {
      const redirectUrl = new URL(
        `${getStrictLocalizedPath(preferredLocale, pathnameWithoutLocale)}${request.nextUrl.search}`,
        request.url,
      )
      const response = NextResponse.redirect(redirectUrl)
      response.cookies.set('NEXT_LOCALE', preferredLocale, {
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      })
      return response
    }

    if (user && (pathname.includes('/login') || pathname.includes('/register'))) {
      const redirectUrl = new URL(
        getStrictLocalizedPath(
          preferredLocale,
          isAdmin ? '/admin' : isSpecialist ? '/professional/dashboard' : '/dashboard',
        ),
        request.url,
      )
      const response = NextResponse.redirect(redirectUrl)
      response.cookies.set('NEXT_LOCALE', preferredLocale, {
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      })
      return response
    }

    if (isAdminRoute && !isAdmin) {
      const response = NextResponse.redirect(
        new URL(getStrictLocalizedPath(preferredLocale, '/dashboard'), request.url),
      )
      response.cookies.set('NEXT_LOCALE', preferredLocale, {
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      })
      return response
    }

    if (isProfessionalRoute && !isProfessionalApplyRoute && !isSpecialist) {
      const response = NextResponse.redirect(
        new URL(getStrictLocalizedPath(preferredLocale, '/dashboard'), request.url),
      )
      response.cookies.set('NEXT_LOCALE', preferredLocale, {
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      })
      return response
    }

    intlResponse.cookies.set('NEXT_LOCALE', preferredLocale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    })
  }

  return intlResponse
}

export const config = {
  matcher: [
    '/((?!api|_next|.*\\..*).*)',
  ],
}
