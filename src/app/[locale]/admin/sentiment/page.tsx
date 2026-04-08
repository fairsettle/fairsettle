import { Flag, ShieldAlert } from 'lucide-react'

import { AdminFiltersPanel } from '@/components/admin/AdminFiltersPanel'
import { AdminLiveFilters } from '@/components/admin/AdminLiveFilters'
import { AdminMetricCard } from '@/components/admin/AdminMetricCard'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { AdminPageIntro } from '@/components/admin/AdminPageIntro'
import { AdminSectionCard } from '@/components/admin/AdminSectionCard'
import { SentimentReviewButton } from '@/components/admin/SentimentReviewButton'
import { AdminTableShell } from '@/components/admin/AdminTableShell'
import { Badge } from '@/components/ui/badge'
import { parseAdminSentimentQuery } from '@/lib/admin/query'
import { loadAdminSentiment } from '@/lib/admin/sentiment'
import { formatAdminDateTime } from '@/lib/admin/format'

function getScoreClasses(score: number) {
  if (score > 0.8) return 'text-danger'
  if (score >= 0.6) return 'text-warning'
  return 'text-ink-soft'
}

export default async function AdminSentimentPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: Record<string, string | string[] | undefined>
}) {
  const query = parseAdminSentimentQuery(searchParams)
  const result = await loadAdminSentiment(query)
  const pathname = locale === 'en' ? '/admin/sentiment' : `/${locale}/admin/sentiment`

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Safety"
        title="Sentiment flags"
        description="Review high-risk messages and moderate flagged behaviour without exposing participant identity."
        icon={ShieldAlert}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <AdminMetricCard
          metric={{
            label: 'Total sentiment flags',
            value: String(result.summary.totalFlags),
            subtitle: 'Scores above 0.5 across all cases',
          }}
        />
        <AdminMetricCard
          metric={{
            label: 'Requiring review',
            value: String(result.summary.requiringReview),
            subtitle: 'Flags still waiting for admin review',
          }}
        />
      </section>

      <AdminSectionCard
        icon={ShieldAlert}
        title="Sentiment flags"
        description="Flags above the review threshold, anonymised to reduce bias during moderation."
      >
        <AdminFiltersPanel className="max-w-md">
          <AdminLiveFilters
            selects={[
              {
                key: 'status',
                value: query.status,
                placeholder: 'All flags',
                options: [
                  { value: 'all', label: 'All flags' },
                  { value: 'needs_review', label: 'Needs review' },
                  { value: 'reviewed', label: 'Reviewed' },
                ],
              },
            ]}
          />
        </AdminFiltersPanel>

        <AdminTableShell>
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-surface-soft/80 text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Case</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Flag type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {result.rows.length ? (
                result.rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-surface-soft/55">
                    <td className="px-4 py-3 text-ink-soft">{formatAdminDateTime(row.createdAt)}</td>
                    <td className="px-4 py-3 text-ink-soft">{row.caseReference}</td>
                    <td className="px-4 py-3 text-ink">{row.userLabel}</td>
                    <td className={`px-4 py-3 font-medium ${getScoreClasses(row.score)}`}>
                      {row.score.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{row.flagType}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status === 'Reviewed' ? 'secondary' : 'outline'}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {row.status === 'Needs review' ? (
                        <SentimentReviewButton sentimentId={row.id} />
                      ) : (
                        <span className="inline-flex items-center gap-2 text-ink-soft">
                          <Flag className="size-3.5" />
                          Reviewed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-ink-soft">
                    No sentiment flags matched these filters.
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
