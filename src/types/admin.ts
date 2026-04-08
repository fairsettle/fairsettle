import type { SupportedLocale } from '@/lib/locale-path'
import type { CaseStatus, CaseType, ExportTier } from '@/types/core'

export type AdminSourceChannel = 'web' | 'whatsapp'

export type AdminPaginationMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type AdminMetricCard = {
  label: string
  value: string
  subtitle?: string
  detail?: string
}

export type AdminOverviewMetricKey =
  | 'users'
  | 'cases'
  | 'paidConversions'
  | 'revenue'

export type AdminOverviewMetrics = Record<AdminOverviewMetricKey, AdminMetricCard>

export type AdminStatusMetric = {
  status: CaseStatus
  total: number
}

export type AdminSignupWeek = {
  label: string
  total: number
}

export type AdminOverviewData = {
  metrics: AdminOverviewMetrics
  statusCards: AdminStatusMetric[]
  signups: AdminSignupWeek[]
}

export type AdminUsersQuery = {
  page: number
  pageSize: number
  search: string
  language: SupportedLocale | 'all'
  sourceChannel?: AdminSourceChannel | 'all'
}

export type AdminUserRow = {
  id: string
  name: string
  email: string
  language: string
  caseCount: number
  signedUpAt: string
}

export type AdminUsersResult = {
  rows: AdminUserRow[]
  meta: AdminPaginationMeta
}

export type AdminCaseStage =
  | 'Draft'
  | 'Awaiting responder'
  | 'Awaiting next phase'
  | 'In progress'
  | 'Comparison ready'
  | 'Completed'
  | 'Expired'

export type AdminCasesQuery = {
  page: number
  pageSize: number
  search: string
  status: CaseStatus | 'all'
  type: CaseType | 'all'
  sourceChannel?: AdminSourceChannel | 'all'
}

export type AdminCaseRow = {
  id: string
  reference: string
  type: CaseType
  initiatorName: string
  responderName: string
  status: CaseStatus
  stage: AdminCaseStage
  inviteVia: string
  createdAt: string
}

export type AdminCasesResult = {
  rows: AdminCaseRow[]
  meta: AdminPaginationMeta
}

export type AdminPaymentsSummary = {
  revenue: AdminMetricCard
  standard: AdminMetricCard
  resolution: AdminMetricCard
}

export type AdminPaymentRow = {
  id: string
  createdAt: string
  userName: string
  caseReference: string
  tier: ExportTier
  amount: number
  stripeId: string
}

export type AdminPaymentsResult = {
  summary: AdminPaymentsSummary
  rows: AdminPaymentRow[]
  meta: AdminPaginationMeta
}

export type AdminSentimentQuery = {
  page: number
  pageSize: number
  status: 'all' | 'needs_review' | 'reviewed'
}

export type AdminSentimentSummary = {
  totalFlags: number
  requiringReview: number
}

export type AdminSentimentRow = {
  id: string
  createdAt: string
  caseReference: string
  userLabel: string
  score: number
  flagType: string
  status: 'Needs review' | 'Reviewed'
  reviewedAt: string | null
}

export type AdminSentimentResult = {
  summary: AdminSentimentSummary
  rows: AdminSentimentRow[]
  meta: AdminPaginationMeta
}
