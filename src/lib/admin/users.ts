import { buildPaginationMeta } from '@/lib/admin/query'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AdminUsersQuery, AdminUsersResult } from '@/types/admin'

export async function loadAdminUsers(filters: AdminUsersQuery): Promise<AdminUsersResult> {
  const from = (filters.page - 1) * filters.pageSize
  const to = from + filters.pageSize - 1

  let countQuery = supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true })
  let dataQuery = supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, preferred_language, created_at')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.language !== 'all') {
    countQuery = countQuery.eq('preferred_language', filters.language)
    dataQuery = dataQuery.eq('preferred_language', filters.language)
  }

  if (filters.sourceChannel && filters.sourceChannel !== 'all') {
    countQuery = countQuery.eq('source_channel', filters.sourceChannel)
    dataQuery = dataQuery.eq('source_channel', filters.sourceChannel)
  }

  if (filters.search) {
    const escapedSearch = filters.search.replaceAll('%', '')
    const condition = `full_name.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%`
    countQuery = countQuery.or(condition)
    dataQuery = dataQuery.or(condition)
  }

  const [{ count }, { data }] = await Promise.all([countQuery, dataQuery])

  const profileIds = (data ?? []).map((row) => row.id)
  const { data: cases } = profileIds.length
    ? await supabaseAdmin
        .from('cases')
        .select('initiator_id, responder_id')
        .or(`initiator_id.in.(${profileIds.join(',')}),responder_id.in.(${profileIds.join(',')})`)
    : { data: [] as { initiator_id: string; responder_id: string | null }[] }

  const caseCounts = new Map<string, number>()
  for (const profileId of profileIds) {
    caseCounts.set(profileId, 0)
  }

  for (const caseRow of cases ?? []) {
    caseCounts.set(
      caseRow.initiator_id,
      (caseCounts.get(caseRow.initiator_id) ?? 0) + 1,
    )

    if (caseRow.responder_id) {
      caseCounts.set(
        caseRow.responder_id,
        (caseCounts.get(caseRow.responder_id) ?? 0) + 1,
      )
    }
  }

  const meta = buildPaginationMeta(filters.page, filters.pageSize, count ?? 0)

  return {
    rows: (data ?? []).map((row: {
      id: string
      full_name: string
      email: string
      preferred_language: string
      created_at: string
    }) => ({
      id: row.id,
      name: row.full_name || 'Unnamed user',
      email: row.email || 'No email',
      language: row.preferred_language,
      caseCount: caseCounts.get(row.id) ?? 0,
      signedUpAt: row.created_at,
    })),
    meta,
  }
}
