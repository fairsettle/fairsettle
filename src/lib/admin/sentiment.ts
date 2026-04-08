import { formatCaseReference } from '@/lib/admin/format'
import { buildPaginationMeta } from '@/lib/admin/query'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AdminSentimentQuery, AdminSentimentResult } from '@/types/admin'
import type { Json } from '@/types/database'

function getFlagType(flags: Json | null, aiPatterns?: Json | null) {
  if (Array.isArray(aiPatterns) && aiPatterns.length > 0) {
    const firstPattern = aiPatterns.find((value) => typeof value === 'string')

    if (typeof firstPattern === 'string') {
      return firstPattern.replaceAll('_', ' ')
    }
  }

  if (!flags || typeof flags !== 'object' || Array.isArray(flags)) {
    return 'General'
  }

  const groups = Object.values(flags).flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return []
    }

    return Object.entries(entry)
      .filter(([, value]) => value === true)
      .map(([key]) => key.replaceAll('_', ' '))
  })

  return groups[0] ?? 'General'
}

export async function loadAdminSentiment(
  query: AdminSentimentQuery,
): Promise<AdminSentimentResult> {
  const from = (query.page - 1) * query.pageSize
  const to = from + query.pageSize - 1

  let countQuery = supabaseAdmin
    .from('sentiment_logs')
    .select('id', { count: 'exact', head: true })
    .gt('sentiment_score', 0.5)
  let rowsQuery = supabaseAdmin
    .from('sentiment_logs')
    .select('id, case_id, user_id, sentiment_score, flags, ai_patterns, reviewed_at, created_at')
    .gt('sentiment_score', 0.5)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (query.status === 'needs_review') {
    countQuery = countQuery.is('reviewed_at', null)
    rowsQuery = rowsQuery.is('reviewed_at', null)
  }

  if (query.status === 'reviewed') {
    countQuery = countQuery.not('reviewed_at', 'is', null)
    rowsQuery = rowsQuery.not('reviewed_at', 'is', null)
  }

  const [
    { count },
    { data: rows },
    { count: totalFlags },
    { count: requiringReview },
  ] = await Promise.all([
    countQuery,
    rowsQuery,
    supabaseAdmin
      .from('sentiment_logs')
      .select('id', { count: 'exact', head: true })
      .gt('sentiment_score', 0.5),
    supabaseAdmin
      .from('sentiment_logs')
      .select('id', { count: 'exact', head: true })
      .gt('sentiment_score', 0.5)
      .is('reviewed_at', null),
  ])

  const anonymizedUserMap = new Map<string, string>()
  let userCounter = 1

  const mappedRows = (rows ?? []).map((row) => {
    if (!anonymizedUserMap.has(row.user_id)) {
      anonymizedUserMap.set(row.user_id, `User #${userCounter}`)
      userCounter += 1
    }

    return {
      id: row.id,
      createdAt: row.created_at,
      caseReference: formatCaseReference(row.case_id),
      userLabel: anonymizedUserMap.get(row.user_id) ?? 'User',
      score: Number(row.sentiment_score ?? 0),
      flagType: getFlagType(row.flags, row.ai_patterns),
      status: row.reviewed_at ? 'Reviewed' : 'Needs review',
      reviewedAt: row.reviewed_at,
    } as const
  })

  return {
    summary: {
      totalFlags: totalFlags ?? 0,
      requiringReview: requiringReview ?? 0,
    },
    rows: mappedRows,
    meta: buildPaginationMeta(query.page, query.pageSize, count ?? 0),
  }
}

export async function markSentimentFlagReviewed(sentimentId: string, reviewerId: string) {
  return supabaseAdmin
    .from('sentiment_logs')
    .update({
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq('id', sentimentId)
    .is('reviewed_at', null)
}
