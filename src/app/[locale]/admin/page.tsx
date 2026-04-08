import { BarChart3, FolderKanban, Users } from 'lucide-react'

import { AdminPageIntro } from '@/components/admin/AdminPageIntro'
import { AdminMetricCard } from '@/components/admin/AdminMetricCard'
import { AdminSectionCard } from '@/components/admin/AdminSectionCard'
import { OverviewSignupsChart } from '@/components/admin/OverviewSignupsChart'
import { OverviewStatusChart } from '@/components/admin/OverviewStatusChart'
import { loadAdminOverviewData } from '@/lib/admin/overview'
import { formatCaseStatusLabel } from '@/lib/cases/labels'

export default async function AdminOverviewPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const overview = await loadAdminOverviewData()

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Internal admin dashboard"
        title="Overview"
        description="Monitor platform growth, case movement, and paid conversions from one shared FairSettle workspace."
        icon={BarChart3}
      />

      <section className="grid gap-4 xl:grid-cols-4">
        <AdminMetricCard metric={overview.metrics.users} />
        <AdminMetricCard metric={overview.metrics.cases} />
        <AdminMetricCard metric={overview.metrics.paidConversions} />
        <AdminMetricCard metric={overview.metrics.revenue} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <AdminSectionCard
          icon={BarChart3}
          title="Signups per week"
          description="Weekly web signups over the last 12 weeks."
        >
          <OverviewSignupsChart data={overview.signups} />
        </AdminSectionCard>

        <AdminSectionCard
          icon={FolderKanban}
          title="Cases by status"
          description="A quick snapshot of the current case lifecycle mix."
        >
          <OverviewStatusChart
            data={overview.statusCards.map((statusCard) => ({
              label: formatCaseStatusLabel(statusCard.status),
              total: statusCard.total,
            }))}
          />
        </AdminSectionCard>
      </section>

      <AdminSectionCard
        icon={Users}
        title="Notes"
        description="Admin access is intentionally read-only in this first release."
        contentClassName="space-y-2 text-sm text-ink-soft"
      >
          <p>This first admin release is web-only in the UI.</p>
          <p>Source-channel fields are already in place in the database so WhatsApp analytics can be added later without another foundational migration.</p>
      </AdminSectionCard>
    </div>
  )
}
