import Link from 'next/link'

import { cn } from '@/lib/utils'

export function BrandLockup({
  href,
  label,
  className,
}: {
  href: string
  label: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex min-h-11 items-center rounded-full px-1 text-xl font-semibold tracking-tight text-brand transition-all duration-200 hover:-translate-y-0.5 hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 sm:text-2xl',
        className,
      )}
    >
      <span className="font-display">{label}</span>
    </Link>
  )
}
