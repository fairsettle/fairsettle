import { Users } from 'lucide-react'

import { AdminFiltersPanel } from '@/components/admin/AdminFiltersPanel'
import { AdminLiveFilters } from '@/components/admin/AdminLiveFilters'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { AdminPageIntro } from '@/components/admin/AdminPageIntro'
import { AdminSectionCard } from '@/components/admin/AdminSectionCard'
import { AdminTableShell } from '@/components/admin/AdminTableShell'
import { Badge } from '@/components/ui/badge'
import { loadAdminUsers } from '@/lib/admin/users'
import { parseAdminUsersQuery } from '@/lib/admin/query'
import { formatAdminDate } from '@/lib/admin/format'
import { SUPPORTED_LOCALES } from '@/lib/locale-path'

export default async function AdminUsersPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: Record<string, string | string[] | undefined>
}) {
  const query = parseAdminUsersQuery(searchParams)
  const result = await loadAdminUsers(query)
  const pathname = locale === 'en' ? '/admin/users' : `/${locale}/admin/users`

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="People"
        title="Users"
        description="Search the user base, scan language preferences, and understand how many cases each person is attached to."
        icon={Users}
      />

      <AdminSectionCard
        icon={Users}
        title="Users"
        description="Search registered users, review language preferences, and track overall case volume."
      >
        <AdminFiltersPanel>
          <AdminLiveFilters
            className="gap-3 lg:grid-cols-[minmax(0,1.5fr)_220px]"
            search={{
              placeholder: 'Search by name or email',
              value: query.search,
            }}
            selects={[
              {
                key: 'language',
                value: query.language,
                placeholder: 'All languages',
                options: [
                  { value: 'all', label: 'All languages' },
                  ...SUPPORTED_LOCALES.map((supportedLocale) => ({
                    value: supportedLocale,
                    label: supportedLocale.toUpperCase(),
                  })),
                ],
              },
            ]}
          />
        </AdminFiltersPanel>

        <AdminTableShell>
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-surface-soft/80 text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Language</th>
                <th className="px-4 py-3 font-medium">Cases</th>
                <th className="px-4 py-3 font-medium">Signed up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {result.rows.length ? (
                result.rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-surface-soft/55">
                    <td className="px-4 py-3 font-medium text-ink">{row.name}</td>
                    <td className="px-4 py-3 text-ink-soft">{row.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="uppercase">
                        {row.language}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink">{row.caseCount}</td>
                    <td className="px-4 py-3 text-ink-soft">{formatAdminDate(row.signedUpAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-soft">
                    No users matched these filters.
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
