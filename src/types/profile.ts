import type { SupportedLocale } from "@/lib/locale-path";

export type ParentRole = "" | "mum" | "dad";

export interface ChildProfileInput {
  first_name: string;
  date_of_birth: string;
}

export interface ProfileRecord {
  full_name: string;
  preferred_language: SupportedLocale;
  parent_role: Exclude<ParentRole, ""> | null;
  children_count: number | null;
}

export interface ProfilePayload {
  profile: ProfileRecord;
  children: Array<{
    first_name: string | null;
    date_of_birth: string;
  }>;
}
