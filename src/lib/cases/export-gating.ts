import type { Database } from '@/types/database'

type CaseRow = Database['public']['Tables']['cases']['Row']

export function isExportUnlocked(caseItem: Pick<
  CaseRow,
  'status' | 'initiator_satisfied_at' | 'responder_satisfied_at' | 'auto_generate_due_at'
>) {
  if (caseItem.status === 'expired') {
    return true
  }

  if (caseItem.initiator_satisfied_at && caseItem.responder_satisfied_at) {
    return true
  }

  if (
    (caseItem.initiator_satisfied_at || caseItem.responder_satisfied_at) &&
    caseItem.auto_generate_due_at &&
    new Date(caseItem.auto_generate_due_at).getTime() <= Date.now()
  ) {
    return true
  }

  return false
}
