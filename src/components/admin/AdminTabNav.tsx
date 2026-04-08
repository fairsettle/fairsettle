import Link from 'next/link'

import { cn } from '@/lib/utils'

const tabs = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/cases', label: 'Cases' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/sentiment', label: 'Sentiment flags' },
] as const

export function AdminTabNav({
  locale,
  activePath,
}: {
  locale: string
  activePath: string
}) {
  return (
    <nav className="app-panel-soft flex flex-wrap gap-2 p-3">
      {tabs.map((tab) => {
        const localizedHref = locale === 'en' ? tab.href : `/${locale}${tab.href}`
        const isActive = activePath === tab.href

        return (
          <Link
            key={tab.href}
            href={localizedHref}
            className={cn(
              'inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200',
              isActive
                ? 'border-brand/18 bg-brand-soft text-brand-strong shadow-[0_10px_24px_rgba(13,148,136,0.12)]'
                : 'border-transparent bg-transparent text-ink-soft hover:border-brand/12 hover:bg-white/80 hover:text-ink',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
