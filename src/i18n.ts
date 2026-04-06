import { getRequestConfig } from 'next-intl/server'
import { DEFAULT_LOCALE, isSupportedLocale } from '@/lib/locale-path'
import { loadMessages } from '@/lib/messages'

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = (await requestLocale) || DEFAULT_LOCALE
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE
  const messages = await loadMessages(locale)

  return {
    locale,
    messages,
  }
})
