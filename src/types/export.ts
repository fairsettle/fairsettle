import type {
  CaseStatus,
  ExportTier,
  ExportType,
  ViewerRole,
} from "@/types/core";

export interface ExportCasePayload {
  case: {
    id: string;
    viewer_role: ViewerRole;
    status: CaseStatus;
    initiator_satisfied_at: string | null;
    responder_satisfied_at: string | null;
    auto_generate_due_at: string | null;
  };
}

export interface ExportDownloadPayload {
  error?: string | { message?: string };
  download_url?: string;
  tier?: ExportTier;
  export_type?: ExportType;
  is_single_party?: boolean;
}
