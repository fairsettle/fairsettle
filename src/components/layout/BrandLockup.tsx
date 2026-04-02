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
        'inline-flex min-h-11 items-center text-xl font-semibold tracking-tight text-brand transition-colors hover:text-brand-strong sm:text-2xl',
        className,
      )}
    >
      <span className="font-display">{label}</span>
    </Link>
  )
}
