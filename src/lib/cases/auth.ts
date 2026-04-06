import 'server-only'

import { apiError } from '@/lib/api-errors'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type CaseRow = Database['public']['Tables']['cases']['Row']

export async function getAuthorizedCase(caseId: string, req?: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      supabase,
      user: null,
      caseItem: null,
      response: await apiError(req, 'UNAUTHORIZED', 401),
    }
  }

  const { data: caseItem, error: caseError } = await supabaseAdmin
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .maybeSingle()

  if (caseError) {
    return {
      supabase,
      user,
      caseItem: null,
      response: await apiError(req, 'FETCH_FAILED', 400),
    }
  }

  if (!caseItem) {
    return {
      supabase,
      user,
      caseItem: null,
      response: await apiError(req, 'CASE_NOT_FOUND', 404),
    }
  }

  const isParticipant =
    caseItem.initiator_id === user.id || caseItem.responder_id === user.id

  if (!isParticipant) {
    return {
      supabase,
      user,
      caseItem: null,
      response: await apiError(req, 'FORBIDDEN', 403),
    }
  }

  return {
    supabase,
    user,
    caseItem: caseItem as CaseRow,
    response: null,
  }
}
