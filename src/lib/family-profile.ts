import { z } from 'zod'

import type { Database } from '@/types/database'

export const parentRoleSchema = z.enum(['mum', 'dad'])

export const childProfileInputSchema = z.object({
  first_name: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => value?.trim() || undefined),
  date_of_birth: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date_of_birth'),
})

export const childProfileInputsSchema = z.array(childProfileInputSchema).max(20)

export type ChildProfileInput = z.infer<typeof childProfileInputSchema>

export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type ChildRow = Database['public']['Tables']['children']['Row']

export function normalizeChildInputs(children: ChildProfileInput[]) {
  return children.map((child, index) => ({
    first_name: child.first_name?.trim() || null,
    date_of_birth: child.date_of_birth,
    sort_order: index,
  }))
}

export function isFamilyProfileComplete(profile: Pick<ProfileRow, 'parent_role' | 'children_count'>, children: ChildRow[]) {
  if (!profile.parent_role) {
    return false
  }

  if (profile.children_count === null || profile.children_count < 0) {
    return false
  }

  return children.length === profile.children_count
}

export function getCasePhases(caseType: Database['public']['Tables']['cases']['Row']['case_type']) {
  if (caseType === 'combined') {
    return ['child', 'financial', 'asset'] as const
  }

  return [caseType] as const
}

export function calculateChildAge(dateOfBirth: string, referenceDate = new Date()) {
  const dob = new Date(dateOfBirth)

  let age = referenceDate.getUTCFullYear() - dob.getUTCFullYear()
  const monthDelta = referenceDate.getUTCMonth() - dob.getUTCMonth()

  if (
    monthDelta < 0 ||
    (monthDelta === 0 && referenceDate.getUTCDate() < dob.getUTCDate())
  ) {
    age -= 1
  }

  return Math.max(age, 0)
}

export function formatChildLabel(child: Pick<ChildRow, 'first_name'>, index: number) {
  return child.first_name?.trim() || `Child ${index + 1}`
}

export function makeItemKey(questionId: string, childId?: string | null) {
  return childId ? `${questionId}:${childId}` : questionId
}
