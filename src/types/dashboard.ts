import type {
  CaseFlowState,
  CaseStatus,
  CaseType,
  QuestionSetVersion,
  ViewerRole,
  InvitationStatus,
} from "@/types/core";

export type DashboardRoleFilter = "all" | "initiator" | "responder";

export interface DashboardCase {
  id: string;
  case_type: CaseType;
  viewer_role: ViewerRole;
  question_set_version: QuestionSetVersion;
  completed_phases: string[];
  responder_id: string | null;
  flow_state: CaseFlowState;
  status: CaseStatus;
  created_at: string;
  savings_to_date: number;
}

export interface DashboardCasesMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface DashboardCasesResponse {
  cases: DashboardCase[];
  meta: DashboardCasesMeta;
}

export interface PendingInvitation {
  id: string;
  case_id: string;
  token: string;
  status: Extract<InvitationStatus, "sent" | "opened">;
  sent_at: string;
  opened_at: string | null;
  expires_at: string;
  case_type: CaseType;
  initiator_name: string | null;
}
