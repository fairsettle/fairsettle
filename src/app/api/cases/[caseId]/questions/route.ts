import { NextResponse } from 'next/server'

import { getAuthorizedCase } from '@/lib/cases/auth'
import { getResponderReviewAccess } from '@/lib/invitations'
import { buildQuestionSections, getDisputeTypesForCase } from '@/lib/questions'

export async function GET(
  _req: Request,
  { params }: { params: { caseId: string } },
) {
  const { supabase, user, caseItem, response } = await getAuthorizedCase(params.caseId)

  if (response) {
    return response
  }
  if (!caseItem) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  const isResponder = caseItem.responder_id === user?.id

  if (isResponder && user) {
    const [{ count: responseCount }, reviewAccess] = await Promise.all([
      supabase
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .eq('case_id', params.caseId)
        .eq('user_id', user.id),
      getResponderReviewAccess(params.caseId, user.id),
    ])

    if (!responseCount && !reviewAccess.hasCompletedReview) {
      return NextResponse.json(
        {
          error: 'Responder review required',
          redirect_to: reviewAccess.invitationToken
            ? `/respond/${reviewAccess.invitationToken}`
            : null,
        },
        { status: 409 },
      )
    }
  }

  const disputeTypes = getDisputeTypesForCase(caseItem.case_type)
  const { data: questions, error } = await supabase
    .from('questions')
    .select('*')
    .in('dispute_type', disputeTypes)
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const { sections, totalQuestions, totalSections } = buildQuestionSections(questions ?? [])

  return NextResponse.json({
    sections,
    total_questions: totalQuestions,
    total_sections: totalSections,
  })
}
