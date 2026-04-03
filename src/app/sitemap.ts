import type { MetadataRoute } from 'next'
import { getLocalizedPath, supportedLocales } from '@/lib/locale-path'
import { buildAbsoluteUrl } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return supportedLocales.map((locale) => ({
    url: buildAbsoluteUrl(getLocalizedPath(locale, '/')),
    lastModified,
    changeFrequency: 'weekly',
    priority: locale === 'en' ? 1 : 0.8,
    alternates: {
      languages: Object.fromEntries(
        supportedLocales.map((alternateLocale) => [
          alternateLocale,
          buildAbsoluteUrl(getLocalizedPath(alternateLocale, '/')),
        ]),
      ),
    },
  }))
}

