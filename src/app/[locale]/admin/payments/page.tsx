import { CreditCard } from 'lucide-react'

import { AdminMetricCard } from '@/components/admin/AdminMetricCard'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { AdminPageIntro } from '@/components/admin/AdminPageIntro'
import { AdminSectionCard } from '@/components/admin/AdminSectionCard'
import { AdminTableShell } from '@/components/admin/AdminTableShell'
import { Badge } from '@/components/ui/badge'
import { loadAdminPayments } from '@/lib/admin/payments'
import { formatAdminDateTime, formatCurrency } from '@/lib/admin/format'
import { ADMIN_PAGE_SIZE } from '@/lib/admin/constants'

export default async function AdminPaymentsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: Record<string, string | string[] | undefined>
}) {
  const page = Number.parseInt(
    String(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page ?? '1'),
    10,
  )
  const safePage = Number.isFinite(page) && page > 0 ? page : 1
  const result = await loadAdminPayments(safePage, ADMIN_PAGE_SIZE)
  const pathname = locale === 'en' ? '/admin/payments' : `/${locale}/admin/payments`

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Commerce"
        title="Payments"
        description="Track export revenue, understand tier mix, and review every completed checkout tied to a case."
        icon={CreditCard}
      />

      <section className="grid gap-4 xl:grid-cols-3">
        <AdminMetricCard metric={result.summary.revenue} />
        <AdminMetricCard metric={result.summary.standard} />
        <AdminMetricCard metric={result.summary.resolution} />
      </section>

      <AdminSectionCard
        icon={CreditCard}
        title="Transactions"
        description="All completed export payments tied to their user, case, and tier."
      >
          <AdminTableShell>
            <table className="min-w-full divide-y divide-line text-left text-sm">
              <thead className="bg-surface-soft/80 text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Case</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Stripe ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {result.rows.length ? (
                  result.rows.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-surface-soft/55">
                      <td className="px-4 py-3 text-ink-soft">{formatAdminDateTime(row.createdAt)}</td>
                      <td className="px-4 py-3 font-medium text-ink">{row.userName}</td>
                      <td className="px-4 py-3 text-ink-soft">{row.caseReference}</td>
                      <td className="px-4 py-3">
                        <Badge variant={row.tier === 'resolution' ? 'default' : 'secondary'}>
                          {row.tier === 'resolution' ? 'Resolution' : 'Standard'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-ink">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-soft">{row.stripeId}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-ink-soft">
                      No payments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </AdminTableShell>

          <AdminPagination
            pathname={pathname}
            page={result.meta.page}
            totalPages={result.meta.totalPages}
            searchParams={searchParams}
          />
      </AdminSectionCard>
    </div>
  )
}
