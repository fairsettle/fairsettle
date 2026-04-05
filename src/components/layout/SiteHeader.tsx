'use client'

import Link from 'next/link'

import { BrandLockup } from '@/components/layout/BrandLockup'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import { usePathname } from '@/i18n/navigation'
import { getLocalizedPath } from '@/lib/locale-path'

export function SiteHeader({
  locale,
  brandLabel,
  isAuthenticated = false,
  loginLabel,
}: {
  locale: string
  brandLabel: string
  isAuthenticated?: boolean
  loginLabel?: string
}) {
  const pathname = usePathname() || '/'
  const isAuthSurface =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'

  return (
    <header className="sticky top-0 z-50 px-5 pt-4 sm:pt-5">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 rounded-full border border-white/40 bg-[rgb(var(--background)_/_0.56)] px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-[box-shadow,background-color,border-color] duration-200 sm:px-5">
        <BrandLockup href={getLocalizedPath(locale, '/')} label={brandLabel} />
        <div className="flex items-center gap-2 sm:gap-3">
          {!isAuthenticated && !isAuthSurface && loginLabel ? (
            <Button asChild className="px-5" variant="secondary">
              <Link href={getLocalizedPath(locale, '/login')}>{loginLabel}</Link>
            </Button>
          ) : null}
          <LanguageSwitcher className="shrink-0" locale={locale} />
        </div>
      </div>
    </header>
  )
}
