import 'server-only'

import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

type CaseRow = Database['public']['Tables']['cases']['Row']
type DocumentRow = Database['public']['Tables']['documents']['Row']
type ExportRow = Database['public']['Tables']['exports']['Row']
type InvitationRow = Database['public']['Tables']['invitations']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ResponseRow = Database['public']['Tables']['responses']['Row']
type SentimentLogRow = Database['public']['Tables']['sentiment_logs']['Row']
type TimelineRow = Database['public']['Tables']['case_timeline']['Row']

async function requireData<T>(
  promise: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  label: string,
) {
  const result = await promise

  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`)
  }

  return result.data
}

function uniquePaths(rows: Array<{ file_path: string }>) {
  return [...new Set(rows.map((row) => row.file_path).filter(Boolean))]
}

async function removeStorageFiles(bucket: string, paths: string[]) {
  if (!paths.length) {
    return
  }

  const { error } = await supabaseAdmin.storage.from(bucket).remove(paths)

  if (error) {
    throw new Error(`Unable to delete files from ${bucket}: ${error.message}`)
  }
}

export async function getGdprExportData(userId: string) {
  const [
    profile,
    initiatedCases,
    responderCases,
    responses,
    documents,
    exports,
    sentimentLogs,
  ] = await Promise.all([
    requireData(
      supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle(),
      'Unable to load profile',
    ),
    requireData(
      supabaseAdmin
        .from('cases')
        .select('*')
        .eq('initiator_id', userId)
        .order('created_at', { ascending: true }),
      'Unable to load initiated cases',
    ),
    requireData(
      supabaseAdmin
        .from('cases')
        .select('*')
        .eq('responder_id', userId)
        .order('created_at', { ascending: true }),
      'Unable to load responder cases',
    ),
    requireData(
      supabaseAdmin
        .from('responses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      'Unable to load responses',
    ),
    requireData(
      supabaseAdmin
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      'Unable to load documents',
    ),
    requireData(
      supabaseAdmin
        .from('exports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      'Unable to load exports',
    ),
    requireData(
      supabaseAdmin
        .from('sentiment_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      'Unable to load sentiment logs',
    ),
  ])

  const participantCaseIds = [...new Set([...(initiatedCases ?? []).map((item) => item.id), ...(responderCases ?? []).map((item) => item.id)])]

  const [invitations, timeline] = participantCaseIds.length
    ? await Promise.all([
        requireData(
          supabaseAdmin
            .from('invitations')
            .select('*')
            .in('case_id', participantCaseIds)
            .order('created_at', { ascending: true }),
          'Unable to load invitations',
        ),
        requireData(
          supabaseAdmin
            .from('case_timeline')
            .select('*')
            .in('case_id', participantCaseIds)
            .order('created_at', { ascending: true }),
          'Unable to load case timeline',
        ),
      ])
    : [[], []]

  return {
    exported_at: new Date().toISOString(),
    user_id: userId,
    profile: profile as ProfileRow | null,
    cases: {
      initiated: (initiatedCases ?? []) as CaseRow[],
      responder: (responderCases ?? []) as CaseRow[],
    },
    invitations: invitations as InvitationRow[],
    responses: (responses ?? []) as ResponseRow[],
    documents: (documents ?? []) as DocumentRow[],
    exports: (exports ?? []) as ExportRow[],
    sentiment_logs: (sentimentLogs ?? []) as SentimentLogRow[],
    case_timeline: timeline as TimelineRow[],
  }
}

export async function deleteUserGdprData(userId: string) {
  const [initiatedCases, responderOnlyCases] = await Promise.all([
    requireData(
      supabaseAdmin.from('cases').select('id').eq('initiator_id', userId),
      'Unable to load initiated cases for deletion',
    ),
    requireData(
      supabaseAdmin
        .from('cases')
        .select('id')
        .eq('responder_id', userId)
        .neq('initiator_id', userId),
      'Unable to load responder cases for deletion',
    ),
  ])

  const initiatedCaseIds = (initiatedCases ?? []).map((item) => item.id)

  const [ownedCaseDocuments, userDocuments, ownedCaseExports, userExports] =
    await Promise.all([
      initiatedCaseIds.length
        ? requireData(
            supabaseAdmin
              .from('documents')
              .select('file_path')
              .in('case_id', initiatedCaseIds),
            'Unable to load owned case documents',
          )
        : Promise.resolve([]),
      requireData(
        supabaseAdmin.from('documents').select('file_path').eq('user_id', userId),
        'Unable to load user documents',
      ),
      initiatedCaseIds.length
        ? requireData(
            supabaseAdmin
              .from('exports')
              .select('file_path')
              .in('case_id', initiatedCaseIds),
            'Unable to load owned case exports',
          )
        : Promise.resolve([]),
      requireData(
        supabaseAdmin.from('exports').select('file_path').eq('user_id', userId),
        'Unable to load user exports',
      ),
    ])

  const responderCaseIds = (responderOnlyCases ?? []).map((item) => item.id)

  if (responderCaseIds.length) {
    const { error } = await supabaseAdmin
      .from('cases')
      .update({ responder_id: null })
      .eq('responder_id', userId)
      .neq('initiator_id', userId)

    if (error) {
      throw new Error(`Unable to detach responder from preserved cases: ${error.message}`)
    }
  }

  const timelineResult = await supabaseAdmin
    .from('case_timeline')
    .update({ user_id: null })
    .eq('user_id', userId)

  if (timelineResult.error) {
    throw new Error(`Unable to anonymize timeline events: ${timelineResult.error.message}`)
  }

  await removeStorageFiles(
    'case-documents',
    uniquePaths([...(ownedCaseDocuments ?? []), ...(userDocuments ?? [])]),
  )
  await removeStorageFiles(
    'case-exports',
    uniquePaths([...(ownedCaseExports ?? []), ...(userExports ?? [])]),
  )

  const deleteUserResult = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (deleteUserResult.error) {
    throw new Error(`Unable to delete auth user: ${deleteUserResult.error.message}`)
  }

  return {
    deleted_user_id: userId,
    deleted_initiated_case_ids: initiatedCaseIds,
    detached_responder_case_ids: responderCaseIds,
  }
}
