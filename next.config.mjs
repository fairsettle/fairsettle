import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n.ts')

const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: '*.supabase.co' },
    ],
  },
}

export default withNextIntl(nextConfig)
