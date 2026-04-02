const SUPPORTED_LOCALES = ['en', 'pl', 'ro', 'ar'] as const
const DEFAULT_LOCALE = 'en'

export function stripLocaleFromPathname(pathname: string) {
  const segments = pathname.split('/')
  const maybeLocale = segments[1]

  if (SUPPORTED_LOCALES.includes(maybeLocale as (typeof SUPPORTED_LOCALES)[number])) {
    const remainder = `/${segments.slice(2).join('/')}`.replace(/\/+$/, '')
    return remainder === '' ? '/' : remainder
  }

  return pathname
}

export function getLocalizedPath(locale: string, path: string) {
  const normalizedPath = path === '' ? '/' : path

  if (locale === DEFAULT_LOCALE) {
    return normalizedPath
  }

  return normalizedPath === '/' ? `/${locale}` : `/${locale}${normalizedPath}`
}

export const supportedLocales = SUPPORTED_LOCALES
