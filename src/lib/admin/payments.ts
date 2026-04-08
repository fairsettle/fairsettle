import { EXPORT_TIER_PRICING } from '@/lib/admin/constants'
import { formatCaseReference, formatCurrency } from '@/lib/admin/format'
import { buildPaginationMeta } from '@/lib/admin/query'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AdminPaymentsResult, AdminSourceChannel } from '@/types/admin'

export async function loadAdminPayments(
  page: number,
  pageSize: number,
  sourceChannel: AdminSourceChannel | 'all' = 'all',
): Promise<AdminPaymentsResult> {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let countQuery = supabaseAdmin
    .from('exports')
    .select('id', { count: 'exact', head: true })
    .not('stripe_session_id', 'is', null)
  let dataQuery = supabaseAdmin
    .from('exports')
    .select('id, case_id, user_id, tier, stripe_session_id, created_at')
    .not('stripe_session_id', 'is', null)
    .order('created_at', { ascending: false })
    .range(from, to)
  let summaryQuery = supabaseAdmin
    .from('exports')
    .select('case_id, user_id, tier, stripe_session_id')
    .not('stripe_session_id', 'is', null)

  if (sourceChannel !== 'all') {
    const { data: channelCases } = await supabaseAdmin
      .from('cases')
      .select('id')
      .eq('source_channel', sourceChannel)

    const caseIds = (channelCases ?? []).map((row) => row.id)

    if (caseIds.length === 0) {
      return {
        summary: {
          revenue: { label: 'Total revenue', value: formatCurrency(0), subtitle: '0 paid exports' },
          standard: { label: 'Standard exports', value: '0', subtitle: formatCurrency(0) },
          resolution: { label: 'Resolution exports', value: '0', subtitle: formatCurrency(0) },
        },
        rows: [],
        meta: buildPaginationMeta(page, pageSize, 0),
      }
    }

    countQuery = countQuery.in('case_id', caseIds)
    dataQuery = dataQuery.in('case_id', caseIds)
    summaryQuery = summaryQuery.in('case_id', caseIds)
  }

  const [{ count }, { data }, { data: summaryRows }] = await Promise.all([
    countQuery,
    dataQuery,
    summaryQuery,
  ])

  const profileIds = Array.from(new Set((data ?? []).map((row) => row.user_id)))
  const { data: profiles } = profileIds.length
    ? await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', profileIds)
    : { data: [] as { id: string; full_name: string; email: string }[] }

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  const revenueTotal = (summaryRows ?? []).reduce((sum, row) => sum + EXPORT_TIER_PRICING[row.tier], 0)
  const standardCount = (summaryRows ?? []).filter((row) => row.tier === 'standard').length
  const resolutionCount = (summaryRows ?? []).filter((row) => row.tier === 'resolution').length
  const standardTotal = standardCount * EXPORT_TIER_PRICING.standard
  const resolutionTotal = resolutionCount * EXPORT_TIER_PRICING.resolution

  return {
    summary: {
      revenue: {
        label: 'Total revenue',
        value: formatCurrency(revenueTotal),
        subtitle: `${summaryRows?.length ?? 0} paid exports`,
      },
      standard: {
        label: 'Standard exports',
        value: String(standardCount),
        subtitle: formatCurrency(standardTotal),
      },
      resolution: {
        label: 'Resolution exports',
        value: String(resolutionCount),
        subtitle: formatCurrency(resolutionTotal),
      },
    },
    rows: (data ?? []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      userName:
        profileMap.get(row.user_id)?.full_name ||
        profileMap.get(row.user_id)?.email ||
        'Unknown user',
      caseReference: formatCaseReference(row.case_id),
      tier: row.tier,
      amount: EXPORT_TIER_PRICING[row.tier],
      stripeId: row.stripe_session_id ?? '—',
    })),
    meta: buildPaginationMeta(page, pageSize, count ?? 0),
  }
}
