import type {
  CaseFlowState,
  CaseStatus,
  CaseType,
  InvitationDeliveryStatus,
  InvitationStatus,
  QuestionSetVersion,
  ViewerRole,
} from "@/types/core";

export interface InviteItem {
  id: string;
  recipient_contact: string;
  method: "email" | "sms" | "whatsapp";
  status: InvitationStatus;
  resend_email_id: string | null;
  delivery_status: InvitationDeliveryStatus;
  delivery_last_event_at: string | null;
  delivery_last_event_type: string | null;
  delivery_error: string | null;
  sent_at: string;
  opened_at: string | null;
  accepted_at: string | null;
  expires_at: string;
  reminder_count: number;
  last_reminder_at: string | null;
}

export interface InvitationCaseMeta {
  viewer_role: ViewerRole;
  status: CaseStatus;
  case_type: CaseType;
  question_set_version: QuestionSetVersion;
  completed_phases: string[];
  responder_id: string | null;
  flow_state: CaseFlowState;
}
