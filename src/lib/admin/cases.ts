import { deriveAdminCaseStage } from '@/lib/admin/case-stage'
import { formatCaseReference } from '@/lib/admin/format'
import { buildPaginationMeta } from '@/lib/admin/query'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AdminCaseRow, AdminCasesQuery, AdminCasesResult } from '@/types/admin'

export async function loadAdminCases(filters: AdminCasesQuery): Promise<AdminCasesResult> {
  let baseQuery = supabaseAdmin
    .from('cases')
    .select(
      'id, case_type, status, initiator_id, responder_id, question_set_version, completed_phases, created_at',
    )
    .order('created_at', { ascending: false })

  if (filters.status !== 'all') {
    baseQuery = baseQuery.eq('status', filters.status)
  }

  if (filters.type !== 'all') {
    baseQuery = baseQuery.eq('case_type', filters.type)
  }

  if (filters.sourceChannel && filters.sourceChannel !== 'all') {
    baseQuery = baseQuery.eq('source_channel', filters.sourceChannel)
  }

  const { data: cases } = await baseQuery

  if (!cases || cases.length === 0) {
    return {
      rows: [],
      meta: buildPaginationMeta(filters.page, filters.pageSize, 0),
    }
  }

  const participantIds = Array.from(
    new Set(
      cases.flatMap((caseRow: {
        initiator_id: string
        responder_id: string | null
      }) =>
        [caseRow.initiator_id, caseRow.responder_id].filter(Boolean) as string[],
      ),
    ),
  )

  const [{ data: profiles }, { data: invitations }] = await Promise.all([
    participantIds.length
      ? supabaseAdmin
          .from('profiles')
          .select('id, full_name, email')
          .in('id', participantIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; email: string }[] }),
    supabaseAdmin
      .from('invitations')
      .select('case_id, method, created_at')
      .in(
        'case_id',
        cases.map((caseRow: { id: string }) => caseRow.id),
      )
      .order('created_at', { ascending: false }),
  ])

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const invitationMap = new Map<string, string>()
  for (const invitation of invitations ?? []) {
    if (!invitationMap.has(invitation.case_id)) {
      invitationMap.set(invitation.case_id, invitation.method)
    }
  }

  const rows: AdminCaseRow[] = []
  for (const caseRow of cases as {
    id: string
    case_type: 'child' | 'financial' | 'asset' | 'combined'
    status: 'draft' | 'invited' | 'active' | 'comparison' | 'completed' | 'expired'
    initiator_id: string
    responder_id: string | null
    question_set_version: 'v1' | 'v2'
    completed_phases: string[]
    created_at: string
  }[]) {
    const initiator = profileMap.get(caseRow.initiator_id)
    const responder = caseRow.responder_id ? profileMap.get(caseRow.responder_id) : null
    const reference = formatCaseReference(caseRow.id)
    const searchHaystack = [
      reference,
      caseRow.id,
      initiator?.full_name,
      initiator?.email,
      responder?.full_name,
      responder?.email,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    if (filters.search && !searchHaystack.includes(filters.search.toLowerCase())) {
      continue
    }

    rows.push({
      id: caseRow.id,
      reference,
      type: caseRow.case_type,
      initiatorName: initiator?.full_name || initiator?.email || 'Unknown user',
      responderName: responder?.full_name || responder?.email || 'Not accepted yet',
      status: caseRow.status,
      stage: await deriveAdminCaseStage(caseRow),
      inviteVia: invitationMap.get(caseRow.id) ?? '—',
      createdAt: caseRow.created_at,
    })
  }

  const total = rows.length
  const meta = buildPaginationMeta(filters.page, filters.pageSize, total)
  const from = (meta.page - 1) * meta.pageSize

  return {
    rows: rows.slice(from, from + meta.pageSize),
    meta,
  }
}
