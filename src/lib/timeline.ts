import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Json } from '@/types/database'

export async function logEvent(
  caseId: string,
  eventType:
    | 'case_created'
    | 'questions_started'
    | 'questions_completed'
    | 'invitation_sent'
    | 'invitation_opened'
    | 'invitation_accepted'
    | 'invitation_expired'
    | 'reminder_sent'
    | 'responder_started'
    | 'responder_completed'
    | 'comparison_generated'
    | 'resolution_accepted'
    | 'resolution_modified'
    | 'resolution_rejected'
    | 'document_uploaded'
    | 'export_purchased'
    | 'export_downloaded'
    | 'case_expired',
  userId: string | null = null,
  eventData: Record<string, unknown> = {},
): Promise<void> {
  await supabaseAdmin.from('case_timeline').insert({
    case_id: caseId,
    user_id: userId,
    event_type: eventType,
    event_data: eventData as Json,
  })
}
