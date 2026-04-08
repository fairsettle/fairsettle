'use client'

type StatusDatum = {
  label: string
  total: number
}

const BAR_COLORS = [
  'rgb(13 148 136)',
  'rgb(45 212 191)',
  'rgb(59 130 246)',
  'rgb(99 102 241)',
  'rgb(16 185 129)',
  'rgb(148 163 184)',
]

export function OverviewStatusChart({ data }: { data: StatusDatum[] }) {
  const totalCases = data.reduce((sum, item) => sum + item.total, 0)

  return (
    <div className="space-y-5 rounded-[1.5rem] border border-line/70 bg-[linear-gradient(180deg,rgba(248,250,251,0.72),rgba(255,255,255,0.96))] p-5">
      <div className="space-y-2">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-soft">Live total</p>
            <p className="mt-1 font-display text-4xl leading-none text-ink">{totalCases}</p>
          </div>
          <p className="max-w-[10rem] text-right text-xs leading-5 text-ink-soft">
            Minimal breakdown of where active platform cases sit right now.
          </p>
        </div>

        <div className="flex h-3 overflow-hidden rounded-full bg-surface-soft">
          {data.map((entry, index) => {
            const percentage = totalCases > 0 ? (entry.total / totalCases) * 100 : 0

            return (
              <div
                key={entry.label}
                className="h-full transition-all duration-300"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                }}
              />
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        {data.map((entry, index) => {
          const percentage = totalCases > 0 ? Math.round((entry.total / totalCases) * 100) : 0
          const color = BAR_COLORS[index % BAR_COLORS.length]

          return (
            <div key={entry.label} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-sm text-ink">{entry.label}</span>
              <span className="text-sm text-ink-soft">{percentage}%</span>
              <span className="font-medium text-ink">{entry.total}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
