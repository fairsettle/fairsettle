import type { ReactNode } from 'react'

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'

import {
  buildSafeComparisonPayload,
  type SafeComparisonPayload,
} from '@/lib/comparison'
import {
  buildComparisonItems,
  resolveAll,
  type AnswerValue,
  type CaseContext,
  type QuestionRecord as ResolutionQuestionRecord,
  type RawResponse,
} from '@/lib/resolution/engine'
import {
  getDisputeTypesForCase,
  getLocalizedMessage,
  sortQuestions,
  type QuestionRow,
} from '@/lib/questions'
import { calculateSavings } from '@/lib/savings/calculator'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Database, Json } from '@/types/database'

import { getMessage, loadMessages } from '../messages'

type CaseRow = Database['public']['Tables']['cases']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ResponseRow = Database['public']['Tables']['responses']['Row']
type DocumentRow = Database['public']['Tables']['documents']['Row']
type InvitationRow = Database['public']['Tables']['invitations']['Row']
type ExportRow = Database['public']['Tables']['exports']['Row']
type TimelineRow = Database['public']['Tables']['case_timeline']['Row']

export const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.45,
    paddingHorizontal: 40,
    paddingVertical: 36,
  },
  brand: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#14b8a6',
    borderRadius: 14,
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 700,
    height: 40,
    justifyContent: 'center',
    marginBottom: 18,
    width: 40,
  },
  eyebrow: {
    color: '#0f766e',
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: 10,
  },
  subtitle: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 1.6,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 12,
  },
  sectionIntro: {
    color: '#475569',
    marginBottom: 14,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  statCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 16,
    borderWidth: 1,
    flexGrow: 1,
    padding: 14,
  },
  statLabel: {
    color: '#475569',
    fontSize: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 700,
  },
  panel: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 6,
  },
  row: {
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  rowHeader: {
    color: '#0f766e',
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  rowQuestion: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
  },
  rowAnswer: {
    color: '#334155',
  },
  comparisonHeader: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    color: '#ffffff',
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  comparisonHeaderCell: {
    flexBasis: 0,
    flexGrow: 1,
    fontSize: 10,
    fontWeight: 700,
    paddingRight: 8,
    textTransform: 'uppercase',
  },
  comparisonRow: {
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  comparisonCell: {
    flexBasis: 0,
    flexGrow: 1,
    paddingHorizontal: 4,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 700,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  note: {
    color: '#475569',
    fontSize: 10,
    marginTop: 6,
  },
  smallText: {
    color: '#475569',
    fontSize: 10,
  },
  listItem: {
    marginBottom: 8,
  },
  divider: {
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    marginVertical: 10,
  },
  clause: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  signatureRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 18,
  },
  signatureBox: {
    borderTopColor: '#94a3b8',
    borderTopWidth: 1,
    flexGrow: 1,
    paddingTop: 8,
  },
  footer: {
    bottom: 18,
    color: '#64748b',
    fontSize: 9,
    left: 40,
    position: 'absolute',
    right: 40,
    textAlign: 'center',
  },
})

export interface ResolutionDecisionSummary {
  questionId: string
  action: 'accept' | 'modify' | 'reject'
  modifiedValue?: string
  recordedAt: string
}

export interface ExportContext {
  caseItem: CaseRow
  initiatorProfile: ProfileRow
  responderProfile: ProfileRow | null
  purchaserProfile: ProfileRow
  questions: QuestionRow[]
  responses: ResponseRow[]
  documents: DocumentRow[]
  timeline: TimelineRow[]
  invitations: InvitationRow[]
  comparison: SafeComparisonPayload | null
  resolutionSummary: ReturnType<typeof resolveAll> | null
  resolutionDecisions: Map<string, ResolutionDecisionSummary>
  locale: string
  messages: Awaited<ReturnType<typeof loadMessages>>
}

interface PdfPageProps {
  title: string
  subtitle?: string
  children: ReactNode
  footerLabel: string
}

export function PdfPage({ title, subtitle, children, footerLabel }: PdfPageProps) {
  return (
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.brand}>
        <Text>F</Text>
      </View>
      <Text style={pdfStyles.title}>{title}</Text>
      {subtitle ? <Text style={pdfStyles.subtitle}>{subtitle}</Text> : null}
      {children}
      <Text
        fixed
        render={({ pageNumber, totalPages }) =>
          `${footerLabel} - ${pageNumber}/${totalPages}`
        }
        style={pdfStyles.footer}
      />
    </Page>
  )
}

export function formatJsonAnswer(answer: Json | null | undefined): string {
  if (answer === null || answer === undefined) {
    return '-'
  }

  if (typeof answer !== 'object' || Array.isArray(answer)) {
    return String(answer)
  }

  const value = 'value' in answer ? answer.value : undefined
  const values = 'values' in answer ? answer.values : undefined

  if (Array.isArray(values)) {
    return values.map((item) => String(item)).join(', ')
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(', ')
  }

  if (value === undefined || value === null) {
    return '-'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  return String(value)
}

export function groupResponsesBySection(
  questions: QuestionRow[],
  responses: ResponseRow[],
) {
  const responseMap = new Map(responses.map((response) => [response.question_id, response]))
  const grouped = new Map<
    string,
    Array<{ question: QuestionRow; response: ResponseRow | undefined }>
  >()

  for (const question of sortQuestions(questions)) {
    if (!grouped.has(question.section)) {
      grouped.set(question.section, [])
    }

    grouped.get(question.section)?.push({
      question,
      response: responseMap.get(question.id),
    })
  }

  return [...grouped.entries()].map(([section, items]) => ({ section, items }))
}

export function buildResolutionDecisionMap(
  timeline: TimelineRow[],
): Map<string, ResolutionDecisionSummary> {
  const map = new Map<string, ResolutionDecisionSummary>()

  for (const event of timeline) {
    if (
      event.event_type !== 'resolution_accepted' &&
      event.event_type !== 'resolution_modified' &&
      event.event_type !== 'resolution_rejected'
    ) {
      continue
    }

    const eventData =
      event.event_data && typeof event.event_data === 'object' && !Array.isArray(event.event_data)
        ? event.event_data
        : {}
    const questionId =
      typeof eventData.question_id === 'string' ? eventData.question_id : undefined

    if (!questionId) {
      continue
    }

    map.set(questionId, {
      questionId,
      action:
        event.event_type === 'resolution_modified'
          ? 'modify'
          : event.event_type === 'resolution_rejected'
            ? 'reject'
            : 'accept',
      modifiedValue:
        typeof eventData.modified_value === 'string' ? eventData.modified_value : undefined,
      recordedAt: event.created_at,
    })
  }

  return map
}

function parseAnswerString(answerValue: AnswerValue | null | undefined) {
  if (!answerValue) {
    return undefined
  }

  return typeof answerValue.value === 'string' ? answerValue.value : undefined
}

function parseAnswerNumber(answerValue: AnswerValue | null | undefined) {
  if (!answerValue) {
    return undefined
  }

  return typeof answerValue.value === 'number' ? answerValue.value : undefined
}

function buildExportCaseContext({
  questions,
  initiatorResponses,
  responderResponses,
  initiatorProfile,
}: {
  questions: ResolutionQuestionRecord[]
  initiatorResponses: RawResponse[]
  responderResponses: RawResponse[]
  initiatorProfile: ProfileRow | null
}): CaseContext {
  const questionById = new Map(questions.map((question) => [question.id, question]))

  let initiatorIncome: number | undefined
  let responderIncome: number | undefined
  let initiatorNightsAnswer: string | undefined
  let responderNightsAnswer: string | undefined

  for (const response of initiatorResponses) {
    const question = questionById.get(response.question_id)

    if (!question) {
      continue
    }

    const questionText = question.question_text.en?.toLowerCase() ?? ''

    if (question.section === 'Income' && questionText.includes('gross annual income')) {
      initiatorIncome = parseAnswerNumber(response.answer_value)
    }

    if (question.section === 'Weekly schedule' && questionText.includes('how many nights per week')) {
      initiatorNightsAnswer = parseAnswerString(response.answer_value)
    }
  }

  for (const response of responderResponses) {
    const question = questionById.get(response.question_id)

    if (!question) {
      continue
    }

    const questionText = question.question_text.en?.toLowerCase() ?? ''

    if (question.section === 'Income' && questionText.includes('gross annual income')) {
      responderIncome = parseAnswerNumber(response.answer_value)
    }

    if (question.section === 'Weekly schedule' && questionText.includes('how many nights per week')) {
      responderNightsAnswer = parseAnswerString(response.answer_value)
    }
  }

  return {
    children_count: initiatorProfile?.children_count ?? 0,
    initiator_income: initiatorIncome,
    responder_income: responderIncome,
    initiator_nights_answer: initiatorNightsAnswer,
    responder_nights_answer: responderNightsAnswer,
  }
}

export async function loadExportContext(
  caseId: string,
  purchaserUserId: string,
): Promise<ExportContext> {
  const caseResult = await supabaseAdmin.from('cases').select('*').eq('id', caseId).single()

  if (caseResult.error || !caseResult.data) {
    throw new Error(caseResult.error?.message ?? 'Case not found')
  }

  const caseItem = caseResult.data
  const disputeTypes = getDisputeTypesForCase(caseItem.case_type)

  const [
    initiatorProfileResult,
    responderProfileResult,
    purchaserProfileResult,
    questionsResult,
    responsesResult,
    documentsResult,
    timelineResult,
    invitationsResult,
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').eq('id', caseItem.initiator_id).single(),
    caseItem.responder_id
      ? supabaseAdmin.from('profiles').select('*').eq('id', caseItem.responder_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabaseAdmin.from('profiles').select('*').eq('id', purchaserUserId).single(),
    supabaseAdmin
      .from('questions')
      .select('*')
      .in('dispute_type', disputeTypes)
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabaseAdmin
      .from('responses')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('documents')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('case_timeline')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('case_id', caseId)
      .order('sent_at', { ascending: true }),
  ])

  if (initiatorProfileResult.error || !initiatorProfileResult.data) {
    throw new Error(initiatorProfileResult.error?.message ?? 'Initiator not found')
  }

  if (purchaserProfileResult.error || !purchaserProfileResult.data) {
    throw new Error(purchaserProfileResult.error?.message ?? 'Purchaser not found')
  }

  if (questionsResult.error) {
    throw new Error(questionsResult.error.message)
  }

  if (responsesResult.error) {
    throw new Error(responsesResult.error.message)
  }

  if (documentsResult.error) {
    throw new Error(documentsResult.error.message)
  }

  if (timelineResult.error) {
    throw new Error(timelineResult.error.message)
  }

  if (invitationsResult.error) {
    throw new Error(invitationsResult.error.message)
  }

  const locale = purchaserProfileResult.data.preferred_language || 'en'
  const messages = await loadMessages(locale)

  let comparison: SafeComparisonPayload | null = null
  let resolutionSummary: ReturnType<typeof resolveAll> | null = null

  if (caseItem.responder_id) {
    try {
      comparison = await buildSafeComparisonPayload({
        caseType: caseItem.case_type,
        caseId,
        initiatorId: caseItem.initiator_id,
        responderId: caseItem.responder_id,
        viewerRole: purchaserUserId === caseItem.responder_id ? 'responder' : 'initiator',
      })

      const initiatorResponses = (responsesResult.data ?? []).filter(
        (response) => response.user_id === caseItem.initiator_id,
      ) as RawResponse[]
      const responderResponses = (responsesResult.data ?? []).filter(
        (response) => response.user_id === caseItem.responder_id,
      ) as RawResponse[]
      const resolutionQuestions = (questionsResult.data ?? []) as ResolutionQuestionRecord[]
      const caseContext = buildExportCaseContext({
        questions: resolutionQuestions,
        initiatorResponses,
        responderResponses,
        initiatorProfile: initiatorProfileResult.data,
      })

      resolutionSummary = resolveAll(
        buildComparisonItems(
          resolutionQuestions,
          initiatorResponses,
          responderResponses,
          caseContext,
        ),
      )
    } catch {
      comparison = null
      resolutionSummary = null
    }
  }

  return {
    caseItem,
    initiatorProfile: initiatorProfileResult.data,
    responderProfile: responderProfileResult.data ?? null,
    purchaserProfile: purchaserProfileResult.data,
    questions: questionsResult.data ?? [],
    responses: responsesResult.data ?? [],
    documents: documentsResult.data ?? [],
    timeline: timelineResult.data ?? [],
    invitations: invitationsResult.data ?? [],
    comparison,
    resolutionSummary,
    resolutionDecisions: buildResolutionDecisionMap(timelineResult.data ?? []),
    locale,
    messages,
  }
}

export function getExportBadge(
  exportType: ExportRow['export_type'],
  messages: Awaited<ReturnType<typeof loadMessages>>,
) {
  return exportType === 'single_party'
    ? getMessage(messages, 'pdf.singlePartyLabel')
    : getMessage(messages, 'pdf.casePackLabel')
}

export function getSavingsSummary(
  stage: number,
  tier: 'standard' | 'resolution',
  messages: Awaited<ReturnType<typeof loadMessages>>,
) {
  const savings = calculateSavings(stage, tier)

  return {
    savings,
    labels: {
      title: getMessage(messages, 'pdf.savingsTitle'),
      solicitor: getMessage(messages, 'savings.solicitorRoute'),
      fairSettle: getMessage(messages, 'savings.fairsettle'),
      saved: getMessage(messages, 'savings.savedLabel'),
    },
  }
}

export function PdfDocument({ children }: { children: ReactNode }) {
  return <Document>{children}</Document>
}
