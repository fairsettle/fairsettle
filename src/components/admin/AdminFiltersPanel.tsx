import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function AdminFiltersPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[1.75rem] border border-line/80 bg-surface-soft/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

