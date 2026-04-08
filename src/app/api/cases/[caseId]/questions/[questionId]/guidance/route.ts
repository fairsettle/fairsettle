import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { getGuidanceAdaptation } from '@/lib/ai/cultural-adaptation'
import { getAiDisclaimer } from '@/lib/ai/disclaimer'
import { getAuthorizedCase } from '@/lib/cases/auth'
import { coerceSupportedLocale } from '@/lib/locale-path'
import { loadMessages } from '@/lib/messages'
import { getLocalizedMessage } from '@/lib/questions'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  req: Request,
  { params }: { params: { caseId: string; questionId: string } },
) {
  const { response } = await getAuthorizedCase(params.caseId, req)

  if (response) {
    return response
  }

  const locale = coerceSupportedLocale(new URL(req.url).searchParams.get('locale'))

  const questionResult = await supabaseAdmin
    .from('questions')
    .select('guidance_text')
    .eq('id', params.questionId)
    .single()

  if (questionResult.error || !questionResult.data) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  const staticGuidance = getLocalizedMessage(questionResult.data.guidance_text, locale)
  const englishGuidance = getLocalizedMessage(questionResult.data.guidance_text, 'en')

  if (!staticGuidance && !englishGuidance) {
    return NextResponse.json({
      body: null,
      ai_generated: false,
      ai_disclaimer: null,
    })
  }

  const adaptation = await getGuidanceAdaptation({
    questionId: params.questionId,
    language: locale,
    guidanceText: englishGuidance || staticGuidance,
  })
  const messages = await loadMessages(locale)

  return NextResponse.json({
    body: adaptation.mode === 'ai' ? adaptation.text : staticGuidance || englishGuidance,
    ai_generated: adaptation.mode === 'ai',
    ai_disclaimer: adaptation.mode === 'ai' ? getAiDisclaimer(messages) : null,
  })
}
