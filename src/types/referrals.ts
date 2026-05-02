import type { Json } from "@/types/database";

export type SpecialistType =
  | "mediator"
  | "solicitor"
  | "financial_adviser"
  | "pension_expert"
  | "child_psychologist";

export type VisibleSpecialistType = Extract<SpecialistType, "mediator" | "solicitor">;

export type ReferralRequestSource =
  | "resolution_cta"
  | "mediator_assist"
  | "marketplace"
  | "admin";

export type ReferralRequestStatus =
  | "new"
  | "reviewing"
  | "matched"
  | "closed"
  | "cancelled";

export type ReferralStatus =
  | "pending"
  | "accepted"
  | "session_scheduled"
  | "recommendation_submitted"
  | "completed"
  | "cancelled";

export type RecommendationResponseAction =
  | "pending"
  | "accept"
  | "modify"
  | "reject";

export type RecommendationPartyStance =
  | "agree_with_party_a"
  | "agree_with_party_b"
  | "alternative";

export type ReferralLocationPreference = "remote" | "local" | "either";

export type ReferralMeetingMode = "video" | "phone" | "in_person";

export type SpecialistApplicationStatus = "pending" | "approved" | "rejected";

export type SpecialistConnectStatus =
  | "not_started"
  | "pending"
  | "completed"
  | "restricted";

export type RecommendationNextStep =
  | "accept_suggestions"
  | "modify_positions"
  | "book_follow_up"
  | "seek_mediation"
  | "seek_solicitor_support"
  | "court_pack_ready";

export type ComplexityFlagKey =
  | "business_ownership"
  | "high_value_pension"
  | "significant_income_disparity"
  | "property_value_dispute"
  | "safeguarding_concern"
  | "international_elements"
  | "no_progress_after_14_days"
  | "extreme_positions";

export type ComplexityFlagSeverity = "low" | "medium" | "high" | "critical";

export type CaseComplexityFlag = {
  key: ComplexityFlagKey;
  severity: ComplexityFlagSeverity;
  reason: string;
  recommended_specialist_type: VisibleSpecialistType;
};

export type ReferralRequestInput = {
  caseId: string;
  specialistType: VisibleSpecialistType;
  preferredTimeWindow: string;
  locationPreference: ReferralLocationPreference;
  locationText: string;
  postcode: string;
  message: string;
};

export type SpecialistApplicationInput = {
  fullName: string;
  email: string;
  specialistType: VisibleSpecialistType;
  accreditationBody: string;
  accreditationNumber: string;
  qualifications: string;
  yearsExperience: number;
  hourlyRate: number;
  languages: string[];
  locationText: string;
  postcode: string;
  remoteAvailable: boolean;
  specialisms: string[];
  bio: string;
  photoPath?: string | null;
};

export type MarketplaceSpecialistCard = {
  id: string;
  fullName: string;
  specialistType: VisibleSpecialistType;
  accreditationBody: string;
  qualifications: string;
  yearsExperience: number;
  hourlyRate: number;
  languages: string[];
  specialisms: string[];
  locationText: string;
  postcode: string;
  remoteAvailable: boolean;
  bio: string;
  photoUrl: string | null;
  ratingAverage: number;
  ratingCount: number;
  nextAvailability: string | null;
  distanceMiles: number | null;
};

export type RecommendationItemInput = {
  item_key: string;
  question_id: string;
  child_id?: string | null;
  question_label?: string;
  recommended_stance: RecommendationPartyStance;
  recommended_value: Json | null;
  reasoning: string;
};

export type SpecialistRecommendationPayload = {
  referralId: string;
  caseId: string;
  items: RecommendationItemInput[];
  overallAssessment: string;
  nextStepsRecommendation: RecommendationNextStep;
  safeguardingFlag: boolean;
  safeguardingNotes?: string;
};
