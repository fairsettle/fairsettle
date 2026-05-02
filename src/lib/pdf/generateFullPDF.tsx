import { renderToBuffer, Text, View } from '@react-pdf/renderer'

import { getNarrativeSummaryForCase } from '@/lib/ai/narratives'
import { getResolutionPayload } from '@/lib/ai/resolution'
import {
  formatJsonAnswer,
  getSavingsSummary,
  groupResponsesBySection,
  loadExportContext,
  PdfDocument,
  PdfPage,
  pdfStyles,
} from './shared'
import { getParentRoleLabel } from '../participant-labels'
import { getLocalizedMessage } from '../questions'
import { getMessage } from '../messages'

export async function generateFullPDF(
  caseId: string,
  tier: 'standard' | 'resolution' | 'mediator_assist',
  userId: string,
): Promise<Buffer> {
  const context = await loadExportContext(caseId, userId)
  const {
    caseItem,
    initiatorProfile,
    responderProfile,
    questions,
    responses,
    documents,
    timeline,
    comparison,
    resolutionSummary,
    resolutionDecisions,
    locale,
    messages,
  } = context

  const [narrativeSummary, aiResolution] = await Promise.all([
    getNarrativeSummaryForCase({
      caseId,
      viewerUserId: userId,
      locale,
    }),
    getResolutionPayload({
      caseId,
      viewerUserId: userId,
      locale,
    }),
  ])

  const initiatorResponses = responses.filter((response) => response.user_id === initiatorProfile.id)
  const responderResponses = responderProfile
    ? responses.filter((response) => response.user_id === responderProfile.id)
    : []
  const initiatorSections = groupResponsesBySection(questions, initiatorResponses)
  const responderSections = groupResponsesBySection(questions, responderResponses)
  const suggestions = aiResolution.suggestions.length
    ? aiResolution.suggestions
    : (resolutionSummary?.results ?? [])
  const normalizedSuggestions: Array<{
    question_id: string
    suggestion_label: string | null
    context_note: string | null
    ai_suggested_outcome: string | null
    ai_reasoning: string | null
    ai_trade_off_note: string | null
  }> = suggestions.map((suggestion) => ({
    question_id: suggestion.question_id,
    suggestion_label:
      'suggestion_label' in suggestion ? suggestion.suggestion_label : null,
    context_note: 'context_note' in suggestion ? suggestion.context_note : null,
    ai_suggested_outcome:
      'ai_suggested_outcome' in suggestion && typeof suggestion.ai_suggested_outcome === 'string'
        ? suggestion.ai_suggested_outcome
        : null,
    ai_reasoning:
      'ai_reasoning' in suggestion && typeof suggestion.ai_reasoning === 'string'
        ? suggestion.ai_reasoning
        : null,
    ai_trade_off_note:
      'ai_trade_off_note' in suggestion && typeof suggestion.ai_trade_off_note === 'string'
        ? suggestion.ai_trade_off_note
        : null,
  }))
  const savingsSummary = getSavingsSummary(5, tier, messages)
  const footerLabel = `${getMessage(messages, 'nav.brand')} ${getMessage(messages, 'pdf.casePackLabel')}`
  const comparisonItemMap = new Map(
    (comparison?.items ?? []).map((item) => [item.question_id, item]),
  )

  const consentClauses = [
    ...(comparison?.items.filter((item) => item.status === 'agreed') ?? []).map((item) => ({
      title: getLocalizedMessage(item.question_text, locale),
      body: formatJsonAnswer(item.party_a_answer),
    })),
    ...suggestions
      .map((suggestion) => {
        const comparisonItem = comparisonItemMap.get(suggestion.question_id)

        return {
          title: comparisonItem
            ? getLocalizedMessage(comparisonItem.question_text, locale)
            : suggestion.question_id,
          body:
            resolutionDecisions.get(suggestion.question_id)?.modifiedValue ||
            suggestion.suggestion_label,
        }
      })
      .filter((clause) => clause.body),
  ]
  const initiatorLabel = getParentRoleLabel(messages, initiatorProfile.parent_role)
  const responderLabel = responderProfile
    ? getParentRoleLabel(messages, responderProfile.parent_role)
    : getMessage(messages, 'roles.otherParent')
  const initiatorPositionTitle = getMessage(messages, 'pdf.participantPositionTitle', {
    partyLabel: initiatorLabel,
  })
  const responderPositionTitle = getMessage(messages, 'pdf.participantPositionTitle', {
    partyLabel: responderLabel,
  })
  const initiatorPositionBody = getMessage(messages, 'pdf.participantPositionBody', {
    partyLabel: initiatorLabel,
  })
  const responderPositionBody = getMessage(messages, 'pdf.participantPositionBody', {
    partyLabel: responderLabel,
  })

  const document = (
    <PdfDocument>
      <PdfPage
        footerLabel={footerLabel}
        subtitle={`${getMessage(messages, 'pdf.caseReference')}: ${caseItem.id}`}
        title={getMessage(messages, 'pdf.casePackLabel')}
      >
        <Text style={pdfStyles.eyebrow}>{getMessage(messages, 'nav.brand')}</Text>
        <View style={pdfStyles.panel}>
          <Text style={pdfStyles.panelTitle}>{getMessage(messages, 'pdf.coverTitle')}</Text>
          <Text style={pdfStyles.smallText}>
            {getMessage(messages, 'pdf.generatedOn')}: {new Date().toLocaleString(locale)}
          </Text>
          <Text style={pdfStyles.smallText}>
            {initiatorLabel}: {initiatorProfile.full_name}
          </Text>
          <Text style={pdfStyles.smallText}>
            {responderLabel}: {responderProfile?.full_name ?? '-'}
          </Text>
          <Text style={pdfStyles.smallText}>
            {getMessage(messages, 'pdf.caseTypeLabel')}: {caseItem.case_type}
          </Text>
          <Text style={pdfStyles.smallText}>
            {getMessage(messages, 'pdf.tierLabel')}: {tier}
          </Text>
        </View>
      </PdfPage>

      <PdfPage
        footerLabel={footerLabel}
        subtitle={getMessage(messages, 'pdf.executiveSummaryBody')}
        title={getMessage(messages, 'pdf.executiveSummaryTitle')}
      >
        <View style={pdfStyles.statGrid}>
          <View style={pdfStyles.statCard}>
            <Text style={pdfStyles.statLabel}>{getMessage(messages, 'comparison.agreedLabel')}</Text>
            <Text style={pdfStyles.statValue}>{comparison?.summary.agreed_count ?? 0}</Text>
          </View>
          <View style={pdfStyles.statCard}>
            <Text style={pdfStyles.statLabel}>{getMessage(messages, 'pdf.gapCount')}</Text>
            <Text style={pdfStyles.statValue}>{comparison?.summary.gap_count ?? 0}</Text>
          </View>
          <View style={pdfStyles.statCard}>
            <Text style={pdfStyles.statLabel}>{getMessage(messages, 'pdf.suggestionCount')}</Text>
            <Text style={pdfStyles.statValue}>{suggestions.length}</Text>
          </View>
        </View>
        <View style={[pdfStyles.panel, { marginTop: 16 }]}>
          <Text style={pdfStyles.smallText}>{narrativeSummary.text}</Text>
          {narrativeSummary.mode === 'ai' ? (
            <Text style={[pdfStyles.note, { marginTop: 10 }]}>
              {getMessage(messages, 'ai.disclaimer')}
            </Text>
          ) : (
            <Text style={[pdfStyles.note, { marginTop: 10 }]}>
              {getMessage(messages, 'pdf.executiveSummaryNote')}
            </Text>
          )}
        </View>
      </PdfPage>

      <PdfPage
        footerLabel={footerLabel}
        subtitle={initiatorPositionBody}
        title={initiatorPositionTitle}
      >
        {initiatorSections.map((section) => (
          <View key={section.section} style={pdfStyles.panel}>
            <Text style={pdfStyles.panelTitle}>{section.section}</Text>
            {section.items.map(({ question, response }) => (
              <View key={question.id} style={pdfStyles.row}>
                <Text style={pdfStyles.rowQuestion}>
                  {getLocalizedMessage(question.question_text, locale)}
                </Text>
                <Text style={pdfStyles.rowAnswer}>{formatJsonAnswer(response?.answer_value)}</Text>
              </View>
            ))}
          </View>
        ))}
      </PdfPage>

      <PdfPage
        footerLabel={footerLabel}
        subtitle={responderPositionBody}
        title={responderPositionTitle}
      >
        {responderSections.map((section) => (
          <View key={section.section} style={pdfStyles.panel}>
            <Text style={pdfStyles.panelTitle}>{section.section}</Text>
            {section.items.map(({ question, response }) => (
              <View key={question.id} style={pdfStyles.row}>
                <Text style={pdfStyles.rowQuestion}>
                  {getLocalizedMessage(question.question_text, locale)}
                </Text>
                <Text style={pdfStyles.rowAnswer}>{formatJsonAnswer(response?.answer_value)}</Text>
              </View>
            ))}
          </View>
        ))}
      </PdfPage>

      <PdfPage
        footerLabel={footerLabel}
        subtitle={getMessage(messages, 'pdf.comparisonBody')}
        title={getMessage(messages, 'pdf.comparisonTitle')}
      >
        <View style={pdfStyles.comparisonHeader}>
          <Text style={pdfStyles.comparisonHeaderCell}>{getMessage(messages, 'pdf.questionColumn')}</Text>
          <Text style={pdfStyles.comparisonHeaderCell}>
            {getMessage(messages, 'pdf.participantColumn', { partyLabel: initiatorLabel })}
          </Text>
          <Text style={pdfStyles.comparisonHeaderCell}>
            {getMessage(messages, 'pdf.participantColumn', { partyLabel: responderLabel })}
          </Text>
          <Text style={pdfStyles.comparisonHeaderCell}>{getMessage(messages, 'pdf.statusColumn')}</Text>
        </View>
        {(comparison?.items ?? []).map((item) => (
          <View key={item.question_id} style={pdfStyles.comparisonRow}>
            <View style={pdfStyles.comparisonCell}>
              <Text>{getLocalizedMessage(item.question_text, locale)}</Text>
            </View>
            <View style={pdfStyles.comparisonCell}>
              <Text>{formatJsonAnswer(item.party_a_answer)}</Text>
            </View>
            <View style={pdfStyles.comparisonCell}>
              <Text>{formatJsonAnswer(item.party_b_answer)}</Text>
            </View>
            <View style={pdfStyles.comparisonCell}>
              <Text
                style={{
                  ...pdfStyles.statusPill,
                  backgroundColor: item.status === 'agreed' ? '#dcfce7' : '#fef3c7',
                  color: item.status === 'agreed' ? '#166534' : '#92400e',
                }}
              >
                {item.status === 'agreed'
                  ? getMessage(messages, 'comparison.agreedLabel')
                  : getMessage(messages, 'comparison.gap')}
              </Text>
            </View>
          </View>
        ))}
      </PdfPage>

      <PdfPage
        footerLabel={footerLabel}
        subtitle={getMessage(messages, 'pdf.suggestionsBody')}
        title={getMessage(messages, 'pdf.suggestionsTitle')}
      >
        {normalizedSuggestions.map((suggestion) => {
          const decision = resolutionDecisions.get(suggestion.question_id)
          const comparisonItem = comparisonItemMap.get(suggestion.question_id)

          return (
            <View key={suggestion.question_id} style={pdfStyles.panel}>
              <Text style={pdfStyles.panelTitle}>
                {comparisonItem
                  ? getLocalizedMessage(comparisonItem.question_text, locale)
                  : suggestion.question_id}
              </Text>
              <Text style={pdfStyles.rowAnswer}>
                {suggestion.ai_suggested_outcome
                  ? suggestion.ai_suggested_outcome
                  : suggestion.suggestion_label}
              </Text>
              {suggestion.ai_reasoning ? (
                <Text style={pdfStyles.note}>{suggestion.ai_reasoning}</Text>
              ) : null}
              {suggestion.ai_trade_off_note ? (
                <Text style={pdfStyles.note}>{suggestion.ai_trade_off_note}</Text>
              ) : null}
              {suggestion.context_note ? (
                <Text style={pdfStyles.note}>{suggestion.context_note}</Text>
              ) : null}
              {decision ? (
                <Text style={pdfStyles.note}>
                  {getMessage(messages, 'pdf.recordedDecision')}: {decision.action}
                  {decision.modifiedValue ? ` - ${decision.modifiedValue}` : ''}
                </Text>
              ) : null}
            </View>
          )
        })}
        {aiResolution.ai_disclaimer ? (
          <View style={pdfStyles.panel}>
            <Text style={pdfStyles.note}>{aiResolution.ai_disclaimer}</Text>
          </View>
        ) : null}
      </PdfPage>

      <PdfPage
        footerLabel={footerLabel}
        subtitle={getMessage(messages, 'pdf.evidenceBody')}
        title={getMessage(messages, 'pdf.evidenceTitle')}
      >
        {documents.length ? (
          documents.map((document) => (
            <View key={document.id} style={pdfStyles.row}>
              <Text style={pdfStyles.rowQuestion}>{document.file_name}</Text>
              <Text style={pdfStyles.rowAnswer}>
                {document.mime_type} - {new Date(document.created_at).toLocaleString(locale)}
              </Text>
            </View>
          ))
        ) : (
          <View style={pdfStyles.panel}>
            <Text style={pdfStyles.smallText}>{getMessage(messages, 'pdf.noEvidence')}</Text>
          </View>
        )}
      </PdfPage>

      <PdfPage
        footerLabel={footerLabel}
        subtitle={getMessage(messages, 'pdf.auditBody')}
        title={getMessage(messages, 'pdf.auditTitle')}
      >
        {timeline.map((event) => (
          <View key={event.id} style={pdfStyles.row}>
            <Text style={pdfStyles.rowQuestion}>{event.event_type}</Text>
            <Text style={pdfStyles.rowAnswer}>
              {new Date(event.created_at).toLocaleString(locale)}
            </Text>
          </View>
        ))}
      </PdfPage>

      <PdfPage
        footerLabel={footerLabel}
        subtitle={getMessage(messages, 'pdf.savingsBody')}
        title={savingsSummary.labels.title}
      >
        <View style={pdfStyles.statGrid}>
          <View style={pdfStyles.statCard}>
            <Text style={pdfStyles.statLabel}>{savingsSummary.labels.solicitor}</Text>
            <Text style={pdfStyles.statValue}>GBP {savingsSummary.savings.solicitorTotal}</Text>
          </View>
          <View style={pdfStyles.statCard}>
            <Text style={pdfStyles.statLabel}>{savingsSummary.labels.fairSettle}</Text>
            <Text style={pdfStyles.statValue}>GBP {savingsSummary.savings.fairSettleTotal}</Text>
          </View>
          <View style={pdfStyles.statCard}>
            <Text style={pdfStyles.statLabel}>{savingsSummary.labels.saved}</Text>
            <Text style={pdfStyles.statValue}>GBP {savingsSummary.savings.saved}</Text>
          </View>
        </View>
      </PdfPage>

      {tier === 'resolution' ? (
        <PdfPage
          footerLabel={footerLabel}
          subtitle={getMessage(messages, 'pdf.consentOrderBody')}
          title={getMessage(messages, 'pdf.consentOrderTitle')}
        >
          <View style={pdfStyles.panel}>
            <Text style={pdfStyles.smallText}>{getMessage(messages, 'pdf.consentOrderDisclaimer')}</Text>
          </View>
          {consentClauses.map((clause, index) => (
            <View key={`${clause.title}-${index}`} style={pdfStyles.clause}>
              <Text style={pdfStyles.rowQuestion}>
                {index + 1}. {clause.title}
              </Text>
              <Text style={pdfStyles.rowAnswer}>{clause.body}</Text>
            </View>
          ))}
          <View style={pdfStyles.signatureRow}>
            <View style={pdfStyles.signatureBox}>
              <Text>{initiatorProfile.full_name}</Text>
            </View>
            <View style={pdfStyles.signatureBox}>
              <Text>{responderProfile?.full_name ?? '-'}</Text>
            </View>
          </View>
        </PdfPage>
      ) : null}

      {tier === 'resolution' ? (
        <PdfPage
          footerLabel={footerLabel}
          subtitle={getMessage(messages, 'pdf.cooperationBody')}
          title={getMessage(messages, 'pdf.cooperationTitle')}
        >
          <View style={pdfStyles.panel}>
            <Text style={pdfStyles.panelTitle}>{initiatorProfile.full_name}</Text>
            <Text style={pdfStyles.rowAnswer}>
              {getMessage(messages, 'pdf.responseTime')}:{' '}
              {initiatorResponses.at(-1)?.submitted_at
                ? new Date(initiatorResponses.at(-1)!.submitted_at!).toLocaleString(locale)
                : '-'}
            </Text>
          </View>
          <View style={pdfStyles.panel}>
            <Text style={pdfStyles.panelTitle}>{responderProfile?.full_name ?? '-'}</Text>
            <Text style={pdfStyles.rowAnswer}>
              {getMessage(messages, 'pdf.responseTime')}:{' '}
              {responderResponses.at(-1)?.submitted_at
                ? new Date(responderResponses.at(-1)!.submitted_at!).toLocaleString(locale)
                : '-'}
            </Text>
          </View>
          <View style={pdfStyles.panel}>
            <Text style={pdfStyles.panelTitle}>{getMessage(messages, 'pdf.engagementLevel')}</Text>
            <Text style={pdfStyles.rowAnswer}>
              {responderResponses.length ? getMessage(messages, 'pdf.engagementHigh') : getMessage(messages, 'pdf.engagementLow')}
            </Text>
            <Text style={pdfStyles.note}>{getMessage(messages, 'pdf.cooperationNote')}</Text>
          </View>
        </PdfPage>
      ) : null}
    </PdfDocument>
  )

  return renderToBuffer(document)
}
