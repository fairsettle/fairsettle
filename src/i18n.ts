import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) || 'en'
  const messages = (
    await import(`../messages/${locale}.json`)
  ).default as Record<string, unknown>

  return {
    locale,
    messages,
  }
})
