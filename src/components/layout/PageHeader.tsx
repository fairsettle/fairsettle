import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function PageHeader({
  locale,
  brandLabel,
  title,
  eyebrow,
  subtitle,
  icon: Icon,
  actions,
  pretitle,
  children,
  className,
  contentClassName,
  titleClassName,
  subtitleClassName,
}: {
  locale: string
  brandLabel: string
  title: ReactNode
  eyebrow?: ReactNode
  subtitle?: ReactNode
  icon?: LucideIcon
  actions?: ReactNode
  pretitle?: ReactNode
  children?: ReactNode
  className?: string
  contentClassName?: string
  titleClassName?: string
  subtitleClassName?: string
}) {
  return (
    <div className={cn('app-panel p-6', className)}>
      <div className={cn('flex flex-col gap-6', actions ? 'lg:flex-row lg:items-start lg:justify-between' : '')}>
        <div className="space-y-5">
          <div className={cn('flex items-start', Icon ? 'gap-4' : '')}>
            {Icon ? (
              <span className="app-icon-chip mt-1 shrink-0">
                <Icon className="size-5" />
              </span>
            ) : null}

            <div className={cn('space-y-3', contentClassName)}>
              {pretitle}
              {eyebrow ? <p className="app-kicker">{eyebrow}</p> : null}
              <h1 className={cn('font-display text-4xl leading-tight text-ink sm:text-[2.75rem]', titleClassName)}>
                {title}
              </h1>
              {subtitle ? (
                <p className={cn('max-w-3xl text-sm leading-6 text-ink-soft', subtitleClassName)}>{subtitle}</p>
              ) : null}
              {children}
            </div>
          </div>
        </div>

        {actions ? <div className="flex shrink-0 flex-col gap-3 lg:items-end lg:self-center">{actions}</div> : null}
      </div>
    </div>
  )
}
