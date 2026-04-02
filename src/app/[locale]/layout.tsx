import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { DocumentLocale } from '@/components/layout/DocumentLocale'
import { SiteHeader } from '@/components/layout/SiteHeader'

const locales = ['en', 'pl', 'ro', 'ar'] as const

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!locales.includes(locale as (typeof locales)[number])) notFound()

  const messages = await getMessages({ locale })
  const t = await getTranslations({ locale })
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DocumentLocale locale={locale} dir={dir} />
      <div
        lang={locale}
        dir={dir}
        className="min-h-screen bg-[radial-gradient(circle_at_top,rgb(var(--page-glow-strong)_/_0.62)_0%,rgb(var(--page)_/_0.9)_24%,rgb(var(--canvas))_72%)]"
      >
        <SiteHeader brandLabel={t('nav.brand')} locale={locale} />
        {children}
      </div>
    </NextIntlClientProvider>
  )
}
