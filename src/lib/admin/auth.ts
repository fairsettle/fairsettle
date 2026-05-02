import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

import { getStrictLocalizedPath } from '@/lib/locale-path'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type AdminContext = {
  userId: string
  fullName: string
  email: string
}

export function readSupabaseUserFromCookies() {
  const cookieStore = cookies()
  const authCookieParts = cookieStore
    .getAll()
    .filter((cookie) => /^sb-.*-auth-token\.\d+$/.test(cookie.name))
    .sort((left, right) => left.name.localeCompare(right.name))

  if (authCookieParts.length === 0) {
    return null
  }

  const serializedSession = authCookieParts.map((cookie) => cookie.value).join('')
  const normalized = serializedSession.startsWith('base64-')
    ? serializedSession.slice('base64-'.length)
    : serializedSession

  try {
    const parsed = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8')) as {
      user?: {
        id?: string
        email?: string
      }
    }

    if (!parsed.user?.id) {
      return null
    }

    return {
      id: parsed.user.id,
      email: parsed.user.email ?? '',
    }
  } catch {
    return null
  }
}

export async function requireAdmin(locale: string): Promise<AdminContext> {
  const user = readSupabaseUserFromCookies()

  if (!user) {
    redirect(getStrictLocalizedPath(locale, '/login'))
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    redirect(getStrictLocalizedPath(locale, '/dashboard'))
  }

  return {
    userId: profile.id,
    fullName: profile.full_name || '',
    email: profile.email || user.email || '',
  }
}
