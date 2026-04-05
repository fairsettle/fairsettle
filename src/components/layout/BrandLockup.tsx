import Image from 'next/image'
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
        'inline-flex min-h-11 items-center rounded-full px-1 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20',
        className,
      )}
    >
      <Image
        src="/brand/fairsettle-logo.png"
        alt={label}
        width={185}
        height={31}
        priority
        className="h-8 w-auto sm:h-9"
      />
    </Link>
  )
}
