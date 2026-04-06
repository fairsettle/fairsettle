import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api-errors'
import {
  childProfileInputsSchema,
  isFamilyProfileComplete,
  normalizeChildInputs,
  parentRoleSchema,
} from '@/lib/family-profile'
import { createClient } from '@/lib/supabase/server'

const profileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  preferred_language: z.enum(['en', 'pl', 'ro', 'ar']).optional(),
  children_count: z.number().int().min(0).max(20).optional(),
  parent_role: parentRoleSchema.optional(),
  children: childProfileInputsSchema.optional(),
}).superRefine((value, ctx) => {
  if (
    value.children !== undefined &&
    value.children_count !== undefined &&
    value.children.length !== value.children_count
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['children'],
      message: 'children must match children_count',
    })
  }
})

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const [{ data: profile, error }, { data: children, error: childrenError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('children')
      .select('*')
      .eq('profile_id', user.id)
      .order('sort_order', { ascending: true }),
  ])

  if (error) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  if (childrenError) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  return NextResponse.json({
    profile,
    children: children ?? [],
    family_profile_complete: isFamilyProfileComplete(profile, children ?? []),
  })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError(req, 'UNAUTHORIZED', 401)
  }

  const body = await req.json()
  const parsed = profileSchema.safeParse(body)

  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, {
      details: parsed.error.issues,
    })
  }

  const { children, ...profilePayload } = parsed.data

  const { data, error } = await supabase
    .from('profiles')
    .update(profilePayload)
    .eq('id', user.id)
    .select('*')
    .single()

  if (error) {
    return apiError(req, 'SAVE_FAILED', 400)
  }

  if (children !== undefined) {
    const { error: deleteError } = await supabase
      .from('children')
      .delete()
      .eq('profile_id', user.id)

    if (deleteError) {
      return apiError(req, 'SAVE_FAILED', 400)
    }

    const normalizedChildren = normalizeChildInputs(children)

    if (normalizedChildren.length > 0) {
      const { error: insertError } = await supabase
        .from('children')
        .insert(
          normalizedChildren.map((child) => ({
            owner_user_id: user.id,
            profile_id: user.id,
            ...child,
          })),
        )

      if (insertError) {
        return apiError(req, 'SAVE_FAILED', 400)
      }
    }
  }

  const { data: savedChildren, error: childrenError } = await supabase
    .from('children')
    .select('*')
    .eq('profile_id', user.id)
    .order('sort_order', { ascending: true })

  if (childrenError) {
    return apiError(req, 'FETCH_FAILED', 400)
  }

  return NextResponse.json({
    profile: data,
    children: savedChildren ?? [],
    family_profile_complete: isFamilyProfileComplete(data, savedChildren ?? []),
  })
}
