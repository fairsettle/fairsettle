import 'server-only'

import { generateFullPDF } from '@/lib/pdf/generateFullPDF'
import { generateSinglePartyPDF } from '@/lib/pdf/generateSinglePartyPDF'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/timeline'
import type { Database } from '@/types/database'

type CaseRow = Database['public']['Tables']['cases']['Row']
type ExportRow = Database['public']['Tables']['exports']['Row']

function buildExportPath(caseId: string, prefix: string) {
  return `exports/${caseId}/${prefix}_${Date.now()}.pdf`
}

export async function findCaseExport(
  caseId: string,
  userId: string,
): Promise<ExportRow | null> {
  const result = await supabaseAdmin
    .from('exports')
    .select('*')
    .eq('case_id', caseId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (result.error) {
    throw new Error(result.error.message)
  }

  return result.data ?? null
}

export async function createStoredFullExport({
  caseId,
  tier,
  userId,
  stripeSessionId,
}: {
  caseId: string
  tier: 'standard' | 'resolution'
  userId: string
  stripeSessionId: string
}) {
  const existing = await supabaseAdmin
    .from('exports')
    .select('*')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle()

  if (existing.data) {
    return existing.data
  }

  if (existing.error) {
    throw new Error(existing.error.message)
  }

  const pdfBuffer = await generateFullPDF(caseId, tier, userId)
  const filePath = buildExportPath(caseId, tier)
  const uploadResult = await supabaseAdmin.storage
    .from('case-exports')
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message)
  }

  const exportResult = await supabaseAdmin
    .from('exports')
    .insert({
      case_id: caseId,
      user_id: userId,
      export_type: 'full_case',
      tier,
      file_path: filePath,
      stripe_session_id: stripeSessionId,
    })
    .select('*')
    .single()

  if (exportResult.error || !exportResult.data) {
    throw new Error(exportResult.error?.message ?? 'Unable to create export record')
  }

  await supabaseAdmin.from('cases').update({ status: 'completed' }).eq('id', caseId)
  await logEvent(caseId, 'export_purchased', userId, { tier, export_id: exportResult.data.id })

  return exportResult.data
}

export async function ensureSinglePartyExport(caseItem: CaseRow) {
  const existing = await supabaseAdmin
    .from('exports')
    .select('*')
    .eq('case_id', caseItem.id)
    .eq('user_id', caseItem.initiator_id)
    .eq('export_type', 'single_party')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing.error) {
    throw new Error(existing.error.message)
  }

  if (existing.data) {
    return existing.data
  }

  const pdfBuffer = await generateSinglePartyPDF(caseItem.id, caseItem.initiator_id)
  const filePath = buildExportPath(caseItem.id, 'single_party')
  const uploadResult = await supabaseAdmin.storage
    .from('case-exports')
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message)
  }

  const exportResult = await supabaseAdmin
    .from('exports')
    .insert({
      case_id: caseItem.id,
      user_id: caseItem.initiator_id,
      export_type: 'single_party',
      tier: 'standard',
      file_path: filePath,
      is_single_party: true,
    })
    .select('*')
    .single()

  if (exportResult.error || !exportResult.data) {
    throw new Error(exportResult.error?.message ?? 'Unable to create single-party export')
  }

  return exportResult.data
}

export async function createSignedExportUrl(filePath: string) {
  const signedUrlResult = await supabaseAdmin.storage
    .from('case-exports')
    .createSignedUrl(filePath, 60 * 60 * 24)

  if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
    throw new Error(signedUrlResult.error?.message ?? 'Unable to create signed URL')
  }

  return signedUrlResult.data.signedUrl
}
