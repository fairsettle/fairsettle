import { NextResponse } from 'next/server'

import { getAuthorizedCase } from '@/lib/cases/auth'
import { buildQuestionSections, getDisputeTypesForCase } from '@/lib/questions'

export async function GET(
  _req: Request,
  { params }: { params: { caseId: string } },
) {
  const { supabase, caseItem, response } = await getAuthorizedCase(params.caseId)

  if (response) {
    return response
  }
  if (!caseItem) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
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
