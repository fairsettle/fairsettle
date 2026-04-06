'use client'

import { ChevronDown, LayoutDashboard, LogOut, UserCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import { BrandLockup } from '@/components/layout/BrandLockup'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import { usePathname } from '@/i18n/navigation'
import { getLocalizedPath } from '@/lib/locale-path'

export function SiteHeader({
  accountLabel,
  locale,
  brandLabel,
  dashboardLabel,
  isAuthenticated = false,
  loginLabel,
  logoutLabel,
  userLabel,
}: {
  accountLabel?: string
  locale: string
  brandLabel: string
  dashboardLabel?: string
  isAuthenticated?: boolean
  loginLabel?: string
  logoutLabel?: string
  userLabel?: string | null
}) {
  const pathname = usePathname() || '/'
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const isAuthSurface =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  const dashboardHref = getLocalizedPath(locale, '/dashboard')
  const displayLabel = useMemo(() => {
    if (!userLabel) {
      return brandLabel
    }

    return userLabel.length > 28 ? `${userLabel.slice(0, 28)}…` : userLabel
  }, [brandLabel, userLabel])
  const initials = useMemo(() => {
    if (!userLabel) {
      return 'FS'
    }

    const cleaned = userLabel.trim()
    if (!cleaned) {
      return 'FS'
    }

    const parts = cleaned.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
    }

    return cleaned.slice(0, 2).toUpperCase()
  }, [userLabel])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current) {
        return
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <header className="sticky top-0 z-50 px-5 pt-4 sm:pt-5">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 rounded-full border border-white/40 bg-[rgb(var(--background)_/_0.56)] px-3 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-[box-shadow,background-color,border-color] duration-200 sm:gap-4 sm:px-5">
        <BrandLockup
          className="min-w-0 shrink"
          href={getLocalizedPath(locale, '/')}
          label={brandLabel}
        />
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <div className="relative shrink-0" ref={menuRef}>
              <button
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
                className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-2 py-2 text-left text-ink shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-brand/20 hover:bg-surface-soft hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] sm:h-12 sm:gap-3 sm:px-2.5"
                type="button"
                onClick={() => setIsMenuOpen((current) => !current)}
              >
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-soft text-[0.68rem] font-semibold tracking-[0.16em] text-brand-strong sm:size-8 sm:text-[0.7rem] sm:tracking-[0.18em]">
                  {initials}
                </span>
                <span className="hidden max-w-36 truncate text-sm font-medium sm:block">
                  {displayLabel}
                </span>
                <ChevronDown
                  className={`size-4 text-ink-soft transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 rounded-[1.5rem] border border-line bg-popover p-2.5 shadow-[0_22px_60px_rgba(15,23,42,0.12)]">
                  <div className="rounded-[1.1rem] bg-surface-soft px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center text-brand-strong">
                        <UserCircle2 className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="app-kicker">{accountLabel ?? 'Account'}</p>
                        <p className="truncate text-sm font-medium text-ink">{displayLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1.5">
                    <Link
                      className="flex items-center justify-between rounded-[1.1rem] px-4 py-3 text-sm font-medium text-ink transition duration-200 hover:bg-surface-soft"
                      href={dashboardHref}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="flex items-center gap-3">
                        <LayoutDashboard className="size-4 text-brand-strong" />
                        {dashboardLabel ?? 'Dashboard'}
                      </span>
                    </Link>
                    <form action="/api/auth/logout" className="w-full" method="post">
                      <button
                        className="flex w-full items-center gap-3 rounded-[1.1rem] px-4 py-3 text-sm font-medium text-ink transition duration-200 hover:bg-surface-soft"
                        type="submit"
                      >
                        <LogOut className="size-4 text-ink-soft" />
                        {logoutLabel ?? 'Sign out'}
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}
            </div>
          ) : !isAuthSurface && loginLabel ? (
            <Button asChild className="px-5" variant="secondary">
              <Link href={getLocalizedPath(locale, '/login')}>{loginLabel}</Link>
            </Button>
          ) : null}
          <LanguageSwitcher className="w-auto shrink-0" locale={locale} />
        </div>
      </div>
    </header>
  )
}
