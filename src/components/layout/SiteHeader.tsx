import { BrandLockup } from '@/components/layout/BrandLockup'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { getLocalizedPath } from '@/lib/locale-path'

export function SiteHeader({
  locale,
  brandLabel,
}: {
  locale: string
  brandLabel: string
}) {
  return (
    <header className="sticky top-0 z-50 px-5 pt-4 sm:pt-5">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 rounded-full border border-white/40 bg-[rgb(var(--background)_/_0.56)] px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-[box-shadow,background-color,border-color] duration-200 sm:px-5">
        <BrandLockup href={getLocalizedPath(locale, '/')} label={brandLabel} />
        <LanguageSwitcher className="shrink-0" locale={locale} />
      </div>
    </header>
  )
}
