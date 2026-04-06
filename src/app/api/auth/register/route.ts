import { NextResponse } from 'next/server'
import { z } from 'zod'

import { buildAppUrl, getRequestOrigin } from '@/lib/app-url'
import { apiError, mapAuthErrorCode } from '@/lib/api-errors'
import {
  childProfileInputsSchema,
  normalizeChildInputs,
  parentRoleSchema,
} from '@/lib/family-profile'
import { createClient } from '@/lib/supabase/server'

const registerSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  preferred_language: z.enum(['en', 'pl', 'ro', 'ar']).default('en'),
  children_count: z.number().int().min(0).max(20),
  parent_role: parentRoleSchema,
  children: childProfileInputsSchema,
  privacy_consent: z.literal(true),
}).superRefine((value, ctx) => {
  if (value.children.length !== value.children_count) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['children'],
      message: 'children must match children_count',
    })
  }
})

export async function POST(req: Request) {
  const requestOrigin = getRequestOrigin(req)
  const body = await req.json()
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    return apiError(req, 'VALIDATION_FAILED', 400, {
      details: parsed.error.issues,
    })
  }

  const {
    full_name,
    email,
    password,
    preferred_language,
    children_count,
    parent_role,
    children,
    privacy_consent,
  } = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        preferred_language,
        children_count,
        parent_role,
        children: normalizeChildInputs(children),
        privacy_consent,
      },
      emailRedirectTo: buildAppUrl('/api/auth/callback', undefined, requestOrigin),
    },
  })

  if (error) {
    return apiError(req, mapAuthErrorCode(error.message), 400)
  }

  return NextResponse.json({
    requires_email_confirmation: !data.session,
    user: {
      id: data.user?.id,
      email: data.user?.email,
    },
  })
}
