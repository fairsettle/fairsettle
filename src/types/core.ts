export type DisputeType = "child" | "financial" | "asset";
export type CaseType = DisputeType | "combined";

export type CaseStatus =
  | "draft"
  | "invited"
  | "active"
  | "comparison"
  | "completed"
  | "expired";

export type ViewerRole = "initiator" | "responder";
export type QuestionSetVersion = "v1" | "v2";

export type CaseFlowState =
  | "default"
  | "continue_next_phase"
  | "waiting_for_responder"
  | "continue_response"
  | "waiting_for_next_phase";

export type CasePhase = DisputeType;

export type InvitationStatus = "sent" | "opened" | "accepted" | "expired";
export type InvitationDeliveryStatus =
  | "queued"
  | "delivered"
  | "delivery_delayed"
  | "bounced"
  | "complained"
  | "failed";

export type ExportTier = "standard" | "resolution" | "mediator_assist";
export type ExportType = "full_case" | "single_party";
