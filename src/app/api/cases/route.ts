import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError, getApiErrorPayload } from '@/lib/api-errors'
import {
  caseMatchesDashboardQuery,
  parseDashboardQuery,
} from '@/lib/cases/dashboard-search'
import { getCaseFlowState } from '@/lib/cases/flow-state'
import { isFamilyProfileComplete } from '@/lib/family-profile'
import { getSavingsStageFromCaseStatus, calculateSavings } from '@/lib/savings/calculator'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/timeline'
import type { ViewerRole } from '@/types/core'

const createCaseSchema = z.object({
  case_type: z.enum(['child', 'financial', 'asset', 'combined']),
})

export async function GET(req: Request) {
  const supabase = await createClient()
  const dashboardQuery = parseDashboardQuery(new URL(req.url).searchParams)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const { data, error } = await supabase
    .from('cases')
    .select('id, case_type, status, created_at, initiator_id, responder_id, question_set_version, completed_phases')
    .or(`initiator_id.eq.${user.id},responder_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  const cases = await Promise.all(
    (data ?? []).map(async (caseItem) => ({
      ...caseItem,
      viewer_role: (caseItem.initiator_id === user.id
        ? 'initiator'
        : 'responder') as ViewerRole,
      flow_state: await getCaseFlowState(caseItem, user.id),
      savings_to_date: calculateSavings(getSavingsStageFromCaseStatus(caseItem.status)).saved,
    })),
  )

  const filteredCases = cases.filter((caseItem) =>
    caseMatchesDashboardQuery(caseItem, dashboardQuery),
  )

  const total = filteredCases.length
  const totalPages = Math.max(1, Math.ceil(total / dashboardQuery.pageSize))
  const page = Math.min(dashboardQuery.page, totalPages)
  const start = (page - 1) * dashboardQuery.pageSize
  const paginatedCases = filteredCases.slice(
    start,
    start + dashboardQuery.pageSize,
  )

  return NextResponse.json({
    cases: paginatedCases,
    meta: {
      page,
      pageSize: dashboardQuery.pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const body = await req.json()
  const parsed = createCaseSchema.safeParse(body)

  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, {
      details: parsed.error.issues,
    })
  }

  const [{ data: profile, error: profileError }, { data: profileChildren, error: childrenError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('children')
      .select('*')
      .eq('profile_id', user.id)
      .order('sort_order', { ascending: true }),
  ])

  if (profileError) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  if (childrenError) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  if (!isFamilyProfileComplete(profile, profileChildren ?? [])) {
    return NextResponse.json(
      {
        error: await getApiErrorPayload(req, 'PROFILE_INCOMPLETE', 409),
        redirect_to: '/complete-profile',
      },
      { status: 409 },
    )
  }

  const { data, error } = await supabase
    .from('cases')
    .insert({
      initiator_id: user.id,
      case_type: parsed.data.case_type,
      question_set_version: 'v2',
      source_channel: profile.source_channel ?? 'web',
    })
    .select('*')
    .single()

  if (error || !data) {
    return apiError(req, 'CREATE_CASE_FAILED', 400)
  }

  if ((profileChildren ?? []).length > 0) {
    const { error: cloneChildrenError } = await supabaseAdmin
      .from('children')
      .insert(
        (profileChildren ?? []).map((child) => ({
          owner_user_id: user.id,
          case_id: data.id,
          source_profile_child_id: child.id,
          first_name: child.first_name,
          date_of_birth: child.date_of_birth,
          sort_order: child.sort_order,
        })),
      )

    if (cloneChildrenError) {
      return apiError(req, 'CREATE_CASE_FAILED', 400)
    }
  }

  await logEvent(data.id, 'case_created', user.id, { case_type: data.case_type })

  return NextResponse.json({ case: data }, { status: 201 })
}
