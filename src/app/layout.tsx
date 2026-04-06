import type { Metadata } from 'next'
import { DM_Sans, Fraunces } from 'next/font/google'
import { DEFAULT_LOCALE, isSupportedLocale } from '@/lib/locale-path'
import { SEO_SITE_NAME, SEO_SITE_ORIGIN } from '@/lib/seo'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' })

export const metadata: Metadata = {
  metadataBase: new URL(SEO_SITE_ORIGIN),
  applicationName: SEO_SITE_NAME,
  title: {
    default: SEO_SITE_NAME,
    template: `%s | ${SEO_SITE_NAME}`,
  },
  description:
    'Resolve parenting, money, and asset disputes online with structured guidance and court-ready exports.',
  keywords: [
    'parenting dispute resolution',
    'separation agreement',
    'child arrangements',
    'financial settlement',
    'online dispute resolution',
    'consent order preparation',
  ],
  category: 'legal',
  creator: SEO_SITE_NAME,
  publisher: SEO_SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: SEO_SITE_NAME,
    url: SEO_SITE_ORIGIN,
    title: SEO_SITE_NAME,
    description:
      'Resolve parenting, money, and asset disputes online with structured guidance and court-ready exports.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: `${SEO_SITE_NAME} social preview`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_SITE_NAME,
    description:
      'Resolve parenting, money, and asset disputes online with structured guidance and court-ready exports.',
    images: ['/twitter-image'],
  },
}

export default function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params?: { locale?: string }
}) {
  const locale = params?.locale && isSupportedLocale(params.locale) ? params.locale : DEFAULT_LOCALE
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir} className="h-full" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${fraunces.variable} min-h-full font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
