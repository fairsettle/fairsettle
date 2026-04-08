import { FolderKanban } from 'lucide-react'

import { AdminFiltersPanel } from '@/components/admin/AdminFiltersPanel'
import { AdminLiveFilters } from '@/components/admin/AdminLiveFilters'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { AdminPageIntro } from '@/components/admin/AdminPageIntro'
import { AdminSectionCard } from '@/components/admin/AdminSectionCard'
import { AdminTableShell } from '@/components/admin/AdminTableShell'
import { Badge } from '@/components/ui/badge'
import { loadAdminCases } from '@/lib/admin/cases'
import { formatAdminDate } from '@/lib/admin/format'
import { parseAdminCasesQuery } from '@/lib/admin/query'
import { formatCaseStatusLabel, formatCaseTypeLabel } from '@/lib/cases/labels'

export default async function AdminCasesPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: Record<string, string | string[] | undefined>
}) {
  const query = parseAdminCasesQuery(searchParams)
  const result = await loadAdminCases(query)
  const pathname = locale === 'en' ? '/admin/cases' : `/${locale}/admin/cases`

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Case management"
        title="Cases"
        description="See exactly where every case sits in the journey, from draft through comparison and completion."
        icon={FolderKanban}
      />

      <AdminSectionCard
        icon={FolderKanban}
        title="Cases"
        description="Review case ownership, lifecycle stage, and invite path in one place."
      >
        <AdminFiltersPanel>
          <AdminLiveFilters
            className="gap-3 xl:grid-cols-[minmax(0,1.5fr)_220px_220px]"
            search={{
              placeholder: 'Search by case ID or participant',
              value: query.search,
            }}
            selects={[
              {
                key: 'status',
                value: query.status,
                placeholder: 'All statuses',
                options: [
                  { value: 'all', label: 'All statuses' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'invited', label: 'Invited' },
                  { value: 'active', label: 'Active' },
                  { value: 'comparison', label: 'Comparison' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'expired', label: 'Expired' },
                ],
              },
              {
                key: 'type',
                value: query.type,
                placeholder: 'All case types',
                options: [
                  { value: 'all', label: 'All case types' },
                  { value: 'child', label: 'Child' },
                  { value: 'financial', label: 'Financial' },
                  { value: 'asset', label: 'Asset' },
                  { value: 'combined', label: 'Combined' },
                ],
              },
            ]}
          />
        </AdminFiltersPanel>

        <AdminTableShell>
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-surface-soft/80 text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Case ID</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Initiator</th>
                <th className="px-4 py-3 font-medium">Responder</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Invite via</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {result.rows.length ? (
                result.rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-surface-soft/55">
                    <td className="px-4 py-3 font-medium text-ink">{row.reference}</td>
                    <td className="px-4 py-3 text-ink-soft">{formatCaseTypeLabel(row.type)}</td>
                    <td className="px-4 py-3 text-ink-soft">{row.initiatorName}</td>
                    <td className="px-4 py-3 text-ink-soft">{row.responderName}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{formatCaseStatusLabel(row.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink">{row.stage}</td>
                    <td className="px-4 py-3 capitalize text-ink-soft">{row.inviteVia}</td>
                    <td className="px-4 py-3 text-ink-soft">{formatAdminDate(row.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-ink-soft">
                    No cases matched these filters.
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
