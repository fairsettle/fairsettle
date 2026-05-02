export const SUPPORTED_LOCALES = ['en', 'pl', 'ro', 'ar', 'es', 'fr', 'de'] as const
export const DEFAULT_LOCALE = 'en'
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export function isSupportedLocale(
  locale: string | null | undefined,
): locale is SupportedLocale {
  return Boolean(locale && SUPPORTED_LOCALES.includes(locale as SupportedLocale))
}

export function coerceSupportedLocale(
  locale: string | null | undefined,
): SupportedLocale {
  return isSupportedLocale(locale) ? locale : DEFAULT_LOCALE
}

export function stripLocaleFromPathname(pathname: string) {
  const segments = pathname.split('/')
  const maybeLocale = segments[1]

  if (isSupportedLocale(maybeLocale)) {
    const remainder = `/${segments.slice(2).join('/')}`.replace(/\/+$/, '')
    return remainder === '' ? '/' : remainder
  }

  return pathname
}

export function getLocaleFromPathname(pathname: string) {
  const maybeLocale = pathname.split('/')[1]
  return isSupportedLocale(maybeLocale) ? maybeLocale : null
}

export function getLocalizedPath(locale: string, path: string) {
  const normalizedPath = path === '' ? '/' : path

  if (locale === DEFAULT_LOCALE) {
    return normalizedPath
  }

  return normalizedPath === '/' ? `/${locale}` : `/${locale}${normalizedPath}`
}

export function getStrictLocalizedPath(locale: string, path: string) {
  const normalizedPath = stripLocaleFromPathname(path === '' ? '/' : path)
  return normalizedPath === '/' ? `/${locale}` : `/${locale}${normalizedPath}`
}

export function localizeHref(locale: string, href: string) {
  const match = href.match(/^([^?#]*)(.*)$/)
  const pathname = match?.[1] || '/'
  const suffix = match?.[2] || ''

  return `${getLocalizedPath(locale, stripLocaleFromPathname(pathname))}${suffix}`
}

export function strictLocalizeHref(locale: string, href: string) {
  const match = href.match(/^([^?#]*)(.*)$/)
  const pathname = match?.[1] || '/'
  const suffix = match?.[2] || ''

  return `${getStrictLocalizedPath(locale, stripLocaleFromPathname(pathname))}${suffix}`
}

export const supportedLocales = SUPPORTED_LOCALES
