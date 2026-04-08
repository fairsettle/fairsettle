import {
  eachWeekOfInterval,
  endOfWeek,
  format,
  isWithinInterval,
  startOfDay,
  startOfWeek,
  subDays,
  subWeeks,
} from 'date-fns'

import { EXPORT_TIER_PRICING } from '@/lib/admin/constants'
import { formatCurrency } from '@/lib/admin/format'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AdminOverviewData, AdminSourceChannel, AdminStatusMetric } from '@/types/admin'
import type { CaseStatus } from '@/types/core'

function withSourceChannel<T>(query: T, sourceChannel?: AdminSourceChannel | 'all') {
  if (!sourceChannel || sourceChannel === 'all') {
    return query
  }

  return (query as { eq: (column: string, value: string) => T }).eq('source_channel', sourceChannel)
}

export async function loadAdminOverviewData(
  sourceChannel: AdminSourceChannel | 'all' = 'all',
): Promise<AdminOverviewData> {
  const now = new Date()
  const sevenDaysAgo = subDays(startOfDay(now), 7).toISOString()
  const signupsRangeStart = startOfWeek(subWeeks(now, 11), { weekStartsOn: 1 })
  const caseIdsForChannel =
    sourceChannel === 'all'
      ? null
      : (
          await supabaseAdmin
            .from('cases')
            .select('id')
            .eq('source_channel', sourceChannel)
        ).data?.map((row) => row.id) ?? []

  const [
    totalUsersResult,
    recentUsersResult,
    totalCasesResult,
    recentCasesResult,
    paidExportsResult,
    statusRowsResult,
    signupsResult,
  ] = await Promise.all([
    withSourceChannel(
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      sourceChannel,
    ),
    withSourceChannel(
      supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo),
      sourceChannel,
    ),
    withSourceChannel(
      supabaseAdmin.from('cases').select('id', { count: 'exact', head: true }),
      sourceChannel,
    ),
    withSourceChannel(
      supabaseAdmin
        .from('cases')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo),
      sourceChannel,
    ),
    withSourceChannel(
      supabaseAdmin
        .from('exports')
        .select('case_id, tier, stripe_session_id')
        .not('stripe_session_id', 'is', null),
      'all',
    ),
    withSourceChannel(supabaseAdmin.from('cases').select('status'), sourceChannel),
    withSourceChannel(
      supabaseAdmin
        .from('profiles')
        .select('created_at')
        .gte('created_at', signupsRangeStart.toISOString())
        .order('created_at', { ascending: true }),
      sourceChannel,
    ),
  ])

  if (caseIdsForChannel && caseIdsForChannel.length === 0) {
    paidExportsResult.data = []
  }

  if (caseIdsForChannel && caseIdsForChannel.length > 0) {
    paidExportsResult.data = (paidExportsResult.data ?? []).filter((row) =>
      caseIdsForChannel.includes(row.case_id),
    )
  }

  const totalUsers = totalUsersResult.count ?? 0
  const recentUsers = recentUsersResult.count ?? 0
  const totalCases = totalCasesResult.count ?? 0
  const recentCases = recentCasesResult.count ?? 0

  const paidCaseIds = new Set(
    (paidExportsResult.data ?? []).map((row) => row.case_id),
  )
  const paidConversions = paidCaseIds.size
  const conversionRate = totalCases > 0 ? Math.round((paidConversions / totalCases) * 100) : 0

  const revenue = (paidExportsResult.data ?? []).reduce(
    (sum, row) => sum + EXPORT_TIER_PRICING[row.tier],
    0,
  )
  const averagePerPaidCase = paidConversions > 0 ? Math.round(revenue / paidConversions) : 0

  const statuses: CaseStatus[] = ['draft', 'invited', 'active', 'comparison', 'completed', 'expired']
  const statusCounts = new Map<CaseStatus, number>(
    statuses.map((status) => [status, 0]),
  )

  for (const row of statusRowsResult.data ?? []) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1)
  }

  const statusCards: AdminStatusMetric[] = statuses.map((status) => ({
    status,
    total: statusCounts.get(status) ?? 0,
  }))

  const weeks = eachWeekOfInterval(
    {
      start: signupsRangeStart,
      end: now,
    },
    { weekStartsOn: 1 },
  )

  const signups = weeks.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    const total = (signupsResult.data ?? []).filter((row) =>
      isWithinInterval(new Date(row.created_at), { start: weekStart, end: weekEnd }),
    ).length

    return {
      label: format(weekStart, 'd MMM'),
      total,
    }
  })

  return {
    metrics: {
      users: {
        label: 'Total users',
        value: String(totalUsers),
        subtitle: `${recentUsers} created in the last 7 days`,
      },
      cases: {
        label: 'Total cases',
        value: String(totalCases),
        subtitle: `${recentCases} created in the last 7 days`,
      },
      paidConversions: {
        label: 'Paid conversions',
        value: String(paidConversions),
        subtitle: `${conversionRate}% conversion rate`,
      },
      revenue: {
        label: 'Revenue to date',
        value: formatCurrency(revenue),
        subtitle: `Average ${formatCurrency(averagePerPaidCase)} per paid case`,
      },
    },
    statusCards,
    signups,
  }
}
