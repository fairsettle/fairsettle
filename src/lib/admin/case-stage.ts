import { getCaseFlowState } from '@/lib/cases/flow-state'
import type { AdminCaseStage } from '@/types/admin'
import type { Database } from '@/types/database'

type AdminStageCase = Pick<
  Database['public']['Tables']['cases']['Row'],
  | 'id'
  | 'case_type'
  | 'status'
  | 'question_set_version'
  | 'completed_phases'
  | 'initiator_id'
  | 'responder_id'
>

export async function deriveAdminCaseStage(caseItem: AdminStageCase): Promise<AdminCaseStage> {
  switch (caseItem.status) {
    case 'expired':
      return 'Expired'
    case 'completed':
      return 'Completed'
    case 'comparison':
      return 'Comparison ready'
    case 'invited':
      return 'Awaiting responder'
    case 'draft':
      return 'Draft'
    case 'active':
      break
    default:
      return 'In progress'
  }

  if (caseItem.initiator_id) {
    const initiatorFlowState = await getCaseFlowState(caseItem, caseItem.initiator_id)

    if (initiatorFlowState === 'waiting_for_responder') {
      return 'Awaiting responder'
    }
  }

  if (caseItem.responder_id) {
    const responderFlowState = await getCaseFlowState(caseItem, caseItem.responder_id)

    if (responderFlowState === 'waiting_for_next_phase') {
      return 'Awaiting next phase'
    }
  }

  return 'In progress'
}
