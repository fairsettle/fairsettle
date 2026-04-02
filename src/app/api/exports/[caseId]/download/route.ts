import { NextResponse } from 'next/server'

import {
  createSignedExportUrl,
  ensureSinglePartyExport,
  findCaseExport,
} from '@/lib/exports'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/timeline'

export async function GET(
  _req: Request,
  { params }: { params: { caseId: string } },
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const caseResult = await supabase
    .from('cases')
    .select('*')
    .eq('id', params.caseId)
    .single()

  if (caseResult.error || !caseResult.data) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  const caseItem = caseResult.data
  const isParticipant =
    caseItem.initiator_id === user.id || caseItem.responder_id === user.id

  if (!isParticipant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    let exportRecord = await findCaseExport(params.caseId, user.id)

    if (!exportRecord && caseItem.status === 'expired' && caseItem.initiator_id === user.id) {
      exportRecord = await ensureSinglePartyExport(caseItem)
    }

    if (!exportRecord) {
      return NextResponse.json({ error: 'Export not ready' }, { status: 404 })
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
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to prepare export download',
      },
      { status: 500 },
    )
  }
}
