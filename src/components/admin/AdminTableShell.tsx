import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function AdminTableShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-[1.75rem] border border-line/90 bg-surface shadow-[0_14px_32px_rgba(15,23,42,0.04)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
