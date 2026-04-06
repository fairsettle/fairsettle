import { defineRouting } from 'next-intl/routing'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/lib/locale-path'

export const routing = defineRouting({
  locales: [...SUPPORTED_LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
  localeCookie: {
    maxAge: 60 * 60 * 24 * 365,
  },
})
