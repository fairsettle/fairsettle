import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { DocumentLocale } from '@/components/layout/DocumentLocale'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { supportedLocales, isSupportedLocale } from '@/lib/locale-path'
import { createClient } from '@/lib/supabase/server'

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!isSupportedLocale(locale)) notFound()

  const messages = await getMessages({ locale })
  const t = await getTranslations({ locale })
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  let isAuthenticated = false
  let isAdmin = false
  let isSpecialist = false
  let userLabel: string | null = null

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    isAuthenticated = Boolean(user)

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, is_admin')
        .eq('id', user.id)
        .maybeSingle()

      isAdmin = Boolean(profile?.is_admin)
      const { data: specialist } = await supabase
        .from('specialists')
        .select('id')
        .eq('profile_id', user.id)
        .eq('is_active', true)
        .eq('is_verified', true)
        .maybeSingle()

      isSpecialist = Boolean(specialist?.id)
      userLabel =
        profile?.full_name ||
        profile?.email ||
        (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
        user.email ||
        null
    }
  } catch {}

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DocumentLocale locale={locale} dir={dir} />
      <div
        lang={locale}
        dir={dir}
        className="min-h-screen bg-[radial-gradient(circle_at_top,rgb(var(--page-glow-strong)_/_0.62)_0%,rgb(var(--page)_/_0.9)_24%,rgb(var(--canvas))_72%)]"
      >
        <SiteHeader
          accountLabel={t('nav.account')}
          adminDashboardLabel={t('nav.adminDashboard')}
          brandLabel={t('nav.brand')}
          dashboardLabel={t('dashboard.title')}
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
          isSpecialist={isSpecialist}
          locale={locale}
          loginLabel={t('login.title')}
          logoutLabel={t('nav.logout')}
          professionalDashboardLabel={t('nav.professionalDashboard')}
          userLabel={userLabel}
        />
        {children}
      </div>
    </NextIntlClientProvider>
  )
}
