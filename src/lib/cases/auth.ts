import 'server-only'

import { NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type CaseRow = Database['public']['Tables']['cases']['Row']

export async function getAuthorizedCase(caseId: string) {
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
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
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
      response: NextResponse.json({ error: caseError.message }, { status: 400 }),
    }
  }

  if (!caseItem) {
    return {
      supabase,
      user,
      caseItem: null,
      response: NextResponse.json({ error: 'Case not found' }, { status: 404 }),
    }
  }

  const isParticipant =
    caseItem.initiator_id === user.id || caseItem.responder_id === user.id

  if (!isParticipant) {
    return {
      supabase,
      user,
      caseItem: null,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return {
    supabase,
    user,
    caseItem: caseItem as CaseRow,
    response: null,
  }
}
