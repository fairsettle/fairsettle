import type { MetadataRoute } from 'next'
import { SEO_SITE_NAME } from '@/lib/seo'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SEO_SITE_NAME,
    short_name: SEO_SITE_NAME,
    description:
      'Resolve parenting, money, and asset disputes online with structured guidance and court-ready exports.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7faf9',
    theme_color: '#0f9488',
  }
}

