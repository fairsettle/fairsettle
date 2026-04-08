import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AdminMetricCard as AdminMetricCardType } from '@/types/admin'

export function AdminMetricCard({ metric }: { metric: AdminMetricCardType }) {
  return (
    <Card size="sm" className="app-panel h-full overflow-visible">
      <CardHeader className="gap-1 border-b border-line/70 pb-4">
        <p className="app-kicker">{metric.label}</p>
      </CardHeader>
      <CardContent className="space-y-3 pb-5 pt-5 sm:pb-6">
        <p className="font-display text-3xl leading-none text-ink sm:text-[2rem]">{metric.value}</p>
        {metric.subtitle ? <p className="text-sm text-ink-soft">{metric.subtitle}</p> : null}
        {metric.detail ? (
          <div className="app-note-brand rounded-[1.25rem] px-4 py-3 text-xs uppercase tracking-[0.2em]">
            {metric.detail}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
