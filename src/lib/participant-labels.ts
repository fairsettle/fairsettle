import { getMessage } from '@/lib/messages'
import type { Database } from '@/types/database'

type Messages = Record<string, unknown>
type ParentRole = Database['public']['Tables']['profiles']['Row']['parent_role']

export function getParentRoleLabel(messages: Messages, role: ParentRole) {
  if (role === 'mum') {
    return getMessage(messages, 'roles.mum')
  }

  if (role === 'dad') {
    return getMessage(messages, 'roles.dad')
  }

  return getMessage(messages, 'roles.parent')
}

export function getOtherParentLabel(messages: Messages, role: ParentRole) {
  if (role === 'mum') {
    return getMessage(messages, 'roles.dad')
  }

  if (role === 'dad') {
    return getMessage(messages, 'roles.mum')
  }

  return getMessage(messages, 'roles.otherParent')
}

export function getPossessiveLabel(label: string) {
  return label.endsWith('s') ? `${label}'` : `${label}'s`
}
