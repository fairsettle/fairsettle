import { ADMIN_PAGE_SIZE } from '@/lib/admin/constants'
import { coerceSupportedLocale, type SupportedLocale } from '@/lib/locale-path'
import type { CaseStatus, CaseType } from '@/types/core'
import type {
  AdminCasesQuery,
  AdminSentimentQuery,
  AdminSourceChannel,
  AdminUsersQuery,
} from '@/types/admin'

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseSourceChannel(value: string | undefined): AdminSourceChannel | 'all' {
  return value === 'web' || value === 'whatsapp' ? value : 'all'
}

export function parseAdminUsersQuery(searchParams: Record<string, string | string[] | undefined>): AdminUsersQuery {
  const languageValue = Array.isArray(searchParams.language)
    ? searchParams.language[0]
    : searchParams.language

  return {
    page: parsePositiveInt(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page, 1),
    pageSize: ADMIN_PAGE_SIZE,
    search: String(Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search ?? '').trim(),
    language: languageValue === 'all' || !languageValue ? 'all' : coerceSupportedLocale(languageValue),
    sourceChannel: parseSourceChannel(
      Array.isArray(searchParams.sourceChannel) ? searchParams.sourceChannel[0] : searchParams.sourceChannel,
    ),
  }
}

export function parseAdminCasesQuery(searchParams: Record<string, string | string[] | undefined>): AdminCasesQuery {
  const statusValue = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status
  const typeValue = Array.isArray(searchParams.type) ? searchParams.type[0] : searchParams.type

  return {
    page: parsePositiveInt(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page, 1),
    pageSize: ADMIN_PAGE_SIZE,
    search: String(Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search ?? '').trim(),
    status:
      statusValue === 'draft' ||
      statusValue === 'invited' ||
      statusValue === 'active' ||
      statusValue === 'comparison' ||
      statusValue === 'completed' ||
      statusValue === 'expired'
        ? (statusValue as CaseStatus)
        : 'all',
    type:
      typeValue === 'child' ||
      typeValue === 'financial' ||
      typeValue === 'asset' ||
      typeValue === 'combined'
        ? (typeValue as CaseType)
        : 'all',
    sourceChannel: parseSourceChannel(
      Array.isArray(searchParams.sourceChannel) ? searchParams.sourceChannel[0] : searchParams.sourceChannel,
    ),
  }
}

export function parseAdminSentimentQuery(
  searchParams: Record<string, string | string[] | undefined>,
): AdminSentimentQuery {
  const statusValue = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status

  return {
    page: parsePositiveInt(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page, 1),
    pageSize: ADMIN_PAGE_SIZE,
    status:
      statusValue === 'needs_review' || statusValue === 'reviewed' ? statusValue : 'all',
  }
}

export function buildPaginationMeta(page: number, pageSize: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return {
    page: Math.min(page, totalPages),
    pageSize,
    total,
    totalPages,
  }
}
