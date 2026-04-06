'use client'

import { Languages } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'

import { usePathname, useRouter } from '@/i18n/navigation'
import { supportedLocales } from '@/lib/locale-path'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const localeFlags: Record<(typeof supportedLocales)[number], string> = {
  en: '🇬🇧',
  pl: '🇵🇱',
  ro: '🇷🇴',
  ar: '🇸🇦',
}

export function LanguageSwitcher({
  locale,
  className,
}: {
  locale: string
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations()
  const [isPending, startTransition] = useTransition()
  const path = pathname || '/'

  return (
    <div className={cn('w-full sm:w-auto', className)}>
      <Select
        disabled={isPending}
        value={locale}
        onValueChange={(nextLocale) => {
          if (nextLocale === locale) {
            return
          }

          startTransition(() => {
            router.replace(path, { locale: nextLocale })
          })
        }}
      >
        <SelectTrigger
          aria-label={t('register.preferredLanguage')}
          className="h-10 min-w-[8.5rem] rounded-full border-line bg-surface/92 pl-2.5 pr-3 text-left text-sm text-ink shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:h-11 sm:min-w-[11.5rem] sm:pl-3 sm:pr-4"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-soft text-ink transition-colors duration-200 sm:h-8 sm:w-8">
              <Languages className="size-3.5 sm:size-4" />
            </span>
            <SelectValue>
              <span className="flex items-center gap-2">
                <span aria-hidden>{localeFlags[locale as (typeof supportedLocales)[number]]}</span>
                <span className="max-w-[4.75rem] truncate sm:max-w-none">{t(`languages.${locale}`)}</span>
              </span>
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent align="end" className="min-w-[11.5rem]">
          {supportedLocales.map((nextLocale) => (
            <SelectItem key={nextLocale} value={nextLocale}>
              <span className="flex items-center gap-2">
                <span aria-hidden>{localeFlags[nextLocale]}</span>
                <span>{t(`languages.${nextLocale}`)}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
