import { redirect } from 'next/navigation'

import { getStrictLocalizedPath } from '@/lib/locale-path'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { readSupabaseUserFromCookies, type AdminContext } from '@/lib/admin/auth'

export type ProfessionalContext = AdminContext & {
  specialistId: string
  specialistType: 'mediator' | 'solicitor'
}

export async function requireSpecialist(locale: string): Promise<ProfessionalContext> {
  const user = readSupabaseUserFromCookies()

  if (!user) {
    redirect(getStrictLocalizedPath(locale, '/login'))
  }

  const [{ data: profile }, { data: specialist }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', user.id)
      .maybeSingle(),
    supabaseAdmin
      .from('specialists')
      .select('id, specialist_type')
      .eq('profile_id', user.id)
      .eq('is_verified', true)
      .eq('is_active', true)
      .maybeSingle(),
  ])

  if (!profile || !specialist || !['mediator', 'solicitor'].includes(specialist.specialist_type)) {
    redirect(getStrictLocalizedPath(locale, '/dashboard'))
  }

  return {
    userId: profile.id,
    fullName: profile.full_name || '',
    email: profile.email || user.email || '',
    specialistId: specialist.id,
    specialistType: specialist.specialist_type as 'mediator' | 'solicitor',
  }
}
