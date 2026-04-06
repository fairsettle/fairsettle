import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { buildSafeComparisonPayload } from '@/lib/comparison'
import { getAuthorizedCase } from '@/lib/cases/auth'
import {
  resolveItem,
  type ComparisonItem as EngineComparisonItem,
} from '@/lib/resolution/engine'

export async function GET(
  req: Request,
  { params }: { params: { caseId: string } },
) {
  const { user, caseItem, response } = await getAuthorizedCase(params.caseId, req)

  if (response) {
    return response
  }
  if (!user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }
  if (!caseItem) {
    return apiError(req, 'CASE_NOT_FOUND', 404)
  }

  if (!caseItem.responder_id) {
    return apiError(req, 'RESOLUTION_NOT_READY', 409)
  }

  try {
    const comparison = await buildSafeComparisonPayload({
      caseType: caseItem.case_type,
      caseId: params.caseId,
      initiatorId: caseItem.initiator_id,
      responderId: caseItem.responder_id,
      viewerRole: caseItem.initiator_id === user.id ? 'initiator' : 'responder',
      questionSetVersion: caseItem.question_set_version,
    })

    const suggestions = comparison.items
      .filter((item) => item.status === 'gap')
      .map((item) => {
        const resolution = resolveItem({
          question_id: item.question_id,
          question_type: item.question_type,
          question_text: item.question_text as Record<string, string>,
          section: item.section,
          dispute_type: item.dispute_type,
          party_a_answer: item.party_a_answer as EngineComparisonItem['party_a_answer'],
          party_b_answer: item.party_b_answer as EngineComparisonItem['party_b_answer'],
          guidance_text: item.guidance_text as Record<string, string> | null,
        })

        const currentValue =
          item.current_value &&
          typeof item.current_value === 'object' &&
          !Array.isArray(item.current_value)
            ? (item.current_value as typeof resolution.suggestion)
            : resolution.suggestion

        return {
          ...resolution,
          item_key: item.item_key,
          child_id: item.child_id,
          child_label: item.child_label,
          question_text: item.question_text,
          question_type: item.question_type,
          options: item.options,
          section: item.section,
          dispute_type: item.dispute_type,
          review_bucket: item.review_bucket,
          round_count: item.round_count,
          is_locked: item.is_locked,
          is_unresolved: item.is_unresolved,
          initiator_status: item.initiator_status,
          responder_status: item.responder_status,
          current_value: currentValue,
        }
      })

    return NextResponse.json({
      suggestions,
      viewer_role: comparison.viewer_role,
      summary: comparison.summary,
    })
  } catch (error) {
    return apiError(req, 'FETCH_FAILED', 400)
  }
}
