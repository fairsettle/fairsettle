import type { Metadata } from 'next'
import { getLocalizedPath, supportedLocales } from '@/lib/locale-path'

const FALLBACK_SITE_ORIGIN = 'https://fairsettle.co.uk'

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, '')
}

export const SEO_SITE_NAME = 'FairSettle'
export const SEO_SITE_ORIGIN = normalizeOrigin(
  process.env.NEXT_PUBLIC_APP_URL || FALLBACK_SITE_ORIGIN,
)

type LocaleSeoConfig = {
  title: string
  description: string
  locale: string
}

const landingSeoByLocale: Record<string, LocaleSeoConfig> = {
  en: {
    title: 'Resolve parenting disputes without going to court',
    description:
      'FairSettle helps separating parents resolve child arrangements, finances, and asset disputes online with structured questions, guided outcomes, and court-ready exports.',
    locale: 'en_GB',
  },
  pl: {
    title: 'Rozwiązuj spory rodzicielskie bez chodzenia do sądu',
    description:
      'FairSettle pomaga rozstającym się rodzicom uzgadniać opiekę nad dziećmi, finanse i majątek online dzięki uporządkowanym pytaniom, wskazówkom i gotowym dokumentom.',
    locale: 'pl_PL',
  },
  ro: {
    title: 'Rezolvă disputele dintre părinți fără să ajungi în instanță',
    description:
      'FairSettle îi ajută pe părinții aflați în separare să rezolve online aspectele legate de copii, bani și bunuri prin întrebări structurate, orientare clară și exporturi pregătite pentru instanță.',
    locale: 'ro_RO',
  },
  ar: {
    title: 'حل نزاعات الوالدين دون اللجوء إلى المحكمة',
    description:
      'يساعد FairSettle الوالدين المنفصلين على ترتيب شؤون الأطفال والمال والأصول عبر الإنترنت من خلال أسئلة منظمة، واقتراحات واضحة، وملفات جاهزة للاستخدام القانوني.',
    locale: 'ar_SA',
  },
}

export function getLandingSeo(locale: string) {
  return landingSeoByLocale[locale] ?? landingSeoByLocale.en
}

export function buildAbsoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${SEO_SITE_ORIGIN}${normalizedPath}`
}

export function buildLocaleAlternates(path: string) {
  const languages = Object.fromEntries(
    supportedLocales.map((locale) => [locale, buildAbsoluteUrl(getLocalizedPath(locale, path))]),
  )

  return {
    canonical: buildAbsoluteUrl(path),
    languages: {
      ...languages,
      'x-default': buildAbsoluteUrl('/'),
    },
  }
}

export function buildPublicMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: string
  path: string
  title: string
  description: string
}): Metadata {
  const localizedPath = getLocalizedPath(locale, path)
  const alternates = buildLocaleAlternates(path)
  const localeConfig = getLandingSeo(locale)

  return {
    title,
    description,
    alternates: {
      canonical: buildAbsoluteUrl(localizedPath),
      languages: alternates.languages,
    },
    openGraph: {
      type: 'website',
      url: buildAbsoluteUrl(localizedPath),
      siteName: SEO_SITE_NAME,
      title,
      description,
      locale: localeConfig.locale,
      images: [
        {
          url: buildAbsoluteUrl('/opengraph-image'),
          width: 1200,
          height: 630,
          alt: `${SEO_SITE_NAME} social preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [buildAbsoluteUrl('/twitter-image')],
    },
  }
}

export function buildNoIndexMetadata(): Metadata {
  return {
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
        noarchive: true,
      },
    },
  }
}

export function getLandingStructuredData(locale: string) {
  const seo = getLandingSeo(locale)
  const localizedHome = buildAbsoluteUrl(getLocalizedPath(locale, '/'))

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SEO_SITE_NAME,
      url: SEO_SITE_ORIGIN,
      logo: buildAbsoluteUrl('/icon'),
      sameAs: [SEO_SITE_ORIGIN],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SEO_SITE_NAME,
      url: SEO_SITE_ORIGIN,
      inLanguage: locale,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SEO_SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: localizedHome,
      description: seo.description,
      offers: [
        {
          '@type': 'Offer',
          priceCurrency: 'GBP',
          price: '49',
          category: 'standard',
        },
        {
          '@type': 'Offer',
          priceCurrency: 'GBP',
          price: '149',
          category: 'resolution',
        },
      ],
    },
  ]
}
