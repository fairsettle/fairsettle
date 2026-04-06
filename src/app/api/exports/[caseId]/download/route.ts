import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import {
  createSignedExportUrl,
  ensureSinglePartyExport,
  findCaseExport,
} from '@/lib/exports'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/timeline'

export async function GET(
  req: Request,
  { params }: { params: { caseId: string } },
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const caseResult = await supabase
    .from('cases')
    .select('*')
    .eq('id', params.caseId)
    .single()

  if (caseResult.error || !caseResult.data) {
    return apiError(req, 'CASE_NOT_FOUND', 404)
  }

  const caseItem = caseResult.data
  const isParticipant =
    caseItem.initiator_id === user.id || caseItem.responder_id === user.id

  if (!isParticipant) {
    return apiError(req, 'FORBIDDEN', 403)
  }

  try {
    let exportRecord = await findCaseExport(params.caseId, user.id)

    if (!exportRecord && caseItem.status === 'expired' && caseItem.initiator_id === user.id) {
      exportRecord = await ensureSinglePartyExport(caseItem)
    }

    if (!exportRecord) {
      return apiError(req, 'EXPORT_NOT_READY', 404)
    }

    const downloadUrl = await createSignedExportUrl(exportRecord.file_path)
    await logEvent(params.caseId, 'export_downloaded', user.id, { export_id: exportRecord.id })

    return NextResponse.json({
      download_url: downloadUrl,
      expires_in: 86400,
      tier: exportRecord.tier,
      export_type: exportRecord.export_type,
      is_single_party: exportRecord.is_single_party,
    })
  } catch (error) {
    return apiError(req, 'FETCH_FAILED', 500)
  }
}
