import type { CaseStatus, CaseType } from '@/types/core'

export function formatCaseStatusLabel(status: CaseStatus) {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'invited':
      return 'Invited'
    case 'active':
      return 'Active'
    case 'comparison':
      return 'Comparison'
    case 'completed':
      return 'Completed'
    case 'expired':
      return 'Expired'
    default:
      return status
  }
}

export function formatCaseTypeLabel(type: CaseType) {
  switch (type) {
    case 'child':
      return 'Child'
    case 'financial':
      return 'Financial'
    case 'asset':
      return 'Asset'
    case 'combined':
      return 'Combined'
    default:
      return type
  }
}
