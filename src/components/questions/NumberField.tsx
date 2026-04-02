'use client'

import { Input } from '@/components/ui/input'

export function NumberField({
  value,
  onChange,
  prefix,
}: {
  value?: number
  onChange: (nextValue: number | undefined) => void
  prefix?: string
}) {
  return (
    <div className="relative">
      {prefix ? (
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft/70">
          {prefix}
        </span>
      ) : null}
      <Input
        className={prefix ? 'pl-8' : undefined}
        inputMode="decimal"
        min={0}
        type="number"
        value={value ?? ''}
        onChange={(event) => {
          const nextValue = event.target.value

          if (nextValue === '') {
            onChange(undefined)
            return
          }

          const parsed = Number(nextValue)
          onChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined)
        }}
      />
    </div>
  )
}
