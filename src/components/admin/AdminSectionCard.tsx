import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function AdminSectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  contentClassName,
}: {
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card className={cn('app-panel', className)}>
      <CardHeader className="border-b border-line/80 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            {Icon ? (
              <span className="app-icon-chip mt-1">
                <Icon className="size-4.5" />
              </span>
            ) : null}

            <div className="space-y-1.5">
              <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
              {description ? <p className="text-sm leading-6 text-ink-soft">{description}</p> : null}
            </div>
          </div>

          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>

      <CardContent className={cn('space-y-6 pb-5 pt-6 sm:pb-6', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
