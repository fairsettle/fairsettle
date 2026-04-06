import { renderToBuffer, Text, View } from '@react-pdf/renderer'

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

export async function generateSinglePartyPDF(
  caseId: string,
  userId: string,
): Promise<Buffer> {
  const context = await loadExportContext(caseId, userId)
  const {
    caseItem,
    initiatorProfile,
    questions,
    responses,
    documents,
    timeline,
    invitations,
    locale,
    messages,
  } = context

  const initiatorResponses = responses.filter((response) => response.user_id === initiatorProfile.id)
  const initiatorSections = groupResponsesBySection(questions, initiatorResponses)
  const latestInvitation = invitations.at(-1)
  const footerLabel = `${getMessage(messages, 'nav.brand')} ${getMessage(messages, 'pdf.singlePartyLabel')}`
  const savingsSummary = getSavingsSummary(4, 'standard', messages)
  const initiatorLabel = getParentRoleLabel(messages, initiatorProfile.parent_role)
  const initiatorPositionTitle = getMessage(messages, 'pdf.participantPositionTitle', {
    partyLabel: initiatorLabel,
  })
  const initiatorPositionBody = getMessage(messages, 'pdf.participantPositionBody', {
    partyLabel: initiatorLabel,
  })

  const document = (
    <PdfDocument>
      <PdfPage
        footerLabel={footerLabel}
        subtitle={`${getMessage(messages, 'pdf.caseReference')}: ${caseItem.id}`}
        title={getMessage(messages, 'pdf.singlePartyLabel')}
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
        </View>
      </PdfPage>

      <PdfPage
        footerLabel={footerLabel}
        subtitle={getMessage(messages, 'pdf.nonEngagementBody')}
        title={getMessage(messages, 'pdf.nonEngagementTitle')}
      >
        <View style={pdfStyles.panel}>
          <Text style={pdfStyles.smallText}>
            {getMessage(messages, 'pdf.inviteeContact')}: {latestInvitation?.recipient_contact ?? '-'}
          </Text>
          <Text style={pdfStyles.smallText}>
            {getMessage(messages, 'pdf.invitationSentAt')}: {latestInvitation ? new Date(latestInvitation.sent_at).toLocaleString(locale) : '-'}
          </Text>
          <Text style={pdfStyles.smallText}>
            {getMessage(messages, 'pdf.remindersSent')}:{' '}
            {timeline
              .filter((event) => event.event_type === 'reminder_sent')
              .map((event) => new Date(event.created_at).toLocaleDateString(locale))
              .join(', ') || '-'}
          </Text>
          <Text style={pdfStyles.smallText}>
            {getMessage(messages, 'pdf.invitationExpiredAt')}: {latestInvitation?.expires_at ? new Date(latestInvitation.expires_at).toLocaleString(locale) : '-'}
          </Text>
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
        subtitle={getMessage(messages, 'pdf.invitationTimelineBody')}
        title={getMessage(messages, 'pdf.invitationTimelineTitle')}
      >
        {timeline
          .filter((event) =>
            ['invitation_sent', 'reminder_sent', 'invitation_expired', 'case_expired'].includes(
              event.event_type,
            ),
          )
          .map((event) => (
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
    </PdfDocument>
  )

  return renderToBuffer(document)
}
