import { getStrictLocalizedPath } from '@/lib/locale-path'

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, '')
}

export function getRequestOrigin(req: Request) {
  return normalizeOrigin(new URL(req.url).origin)
}

export function getAppOrigin(preferredOrigin?: string) {
  if (preferredOrigin) {
    return normalizeOrigin(preferredOrigin)
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL

  if (!origin) {
    throw new Error('NEXT_PUBLIC_APP_URL is not configured')
  }

  return normalizeOrigin(origin)
}

export function buildAppUrl(path: string, locale?: string, preferredOrigin?: string) {
  const localizedPath = locale ? getStrictLocalizedPath(locale, path) : path

  return `${getAppOrigin(preferredOrigin)}${localizedPath.startsWith('/') ? localizedPath : `/${localizedPath}`}`
}
