import type { MetadataRoute } from 'next'
import { supportedLocales } from '@/lib/locale-path'
import { SEO_SITE_ORIGIN } from '@/lib/seo'

function withLocaleVariants(path: string) {
  return [path, ...supportedLocales.filter((locale) => locale !== 'en').map((locale) => `/${locale}${path}`)]
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        ...withLocaleVariants('/dashboard'),
        ...withLocaleVariants('/cases'),
        ...withLocaleVariants('/respond'),
        ...withLocaleVariants('/login'),
        ...withLocaleVariants('/register'),
        ...withLocaleVariants('/invite-lookup'),
      ],
    },
    sitemap: `${SEO_SITE_ORIGIN}/sitemap.xml`,
    host: SEO_SITE_ORIGIN,
  }
}
