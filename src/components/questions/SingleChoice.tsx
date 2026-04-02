'use client'

import { CheckCircle2 } from 'lucide-react'

import { cn } from '@/lib/utils'

export function SingleChoice({
  options,
  value,
  onChange,
}: {
  options: string[]
  value?: string
  onChange: (nextValue: string) => void
}) {
  return (
    <div className="grid gap-3">
      {options.map((option) => {
        const isSelected = value === option

        return (
          <button
            key={option}
            type="button"
            className={cn(
              'flex min-h-[48px] w-full items-center justify-between rounded-3xl border px-4 py-4 text-left text-sm transition',
              isSelected
                ? 'border-brand bg-surface-brand text-brand-strong'
                : 'border-line bg-surface text-ink hover:border-brand/15 hover:bg-surface-soft',
            )}
            onClick={() => onChange(option)}
          >
            <span className="pr-4">{option}</span>
            <CheckCircle2
              className={cn('size-5 shrink-0', isSelected ? 'text-brand' : 'text-line-strong')}
            />
          </button>
        )
      })}
    </div>
  )
}
