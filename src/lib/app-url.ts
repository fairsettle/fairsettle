import { getLocalizedPath } from '@/lib/locale-path'

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, '')
}

export function getAppOrigin() {
  const origin = process.env.NEXT_PUBLIC_APP_URL

  if (!origin) {
    throw new Error('NEXT_PUBLIC_APP_URL is not configured')
  }

  return normalizeOrigin(origin)
}

export function buildAppUrl(path: string, locale?: string) {
  const localizedPath = locale ? getLocalizedPath(locale, path) : path

  return `${getAppOrigin()}${localizedPath.startsWith('/') ? localizedPath : `/${localizedPath}`}`
}
