import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { buildAppUrl, getRequestOrigin } from '@/lib/app-url'
import {
  sendReferralAdminEmail,
  sendSpecialistApplicationReceivedEmail,
} from '@/lib/email/resend'
import { coerceSupportedLocale } from '@/lib/locale-path'
import { createSpecialistApplication, normalizePostcode } from '@/lib/referrals/service'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const formData = await req.formData()
  const photo = formData.get('photo')
  let photoPath: string | null = null

  if (photo instanceof File && photo.size > 0) {
    const extension = photo.name.includes('.') ? photo.name.split('.').pop() : 'jpg'
    photoPath = `applications/${Date.now()}_${randomUUID()}.${extension}`
    const upload = await supabaseAdmin.storage
      .from('specialist-photos')
      .upload(photoPath, photo, {
        contentType: photo.type || 'image/jpeg',
        upsert: false,
      })

    if (upload.error) {
      return apiError(req, 'SAVE_FAILED', 400, { details: upload.error.message })
    }
  }

  const hourlyRate = Number(formData.get('hourlyRate') || 0)
  const yearsExperience = Number(formData.get('yearsExperience') || 0)

  const application = await createSpecialistApplication({
    fullName: String(formData.get('fullName') || ''),
    email: String(formData.get('email') || ''),
    specialistType: String(formData.get('specialistType') || 'mediator') as 'mediator' | 'solicitor',
    accreditationBody: String(formData.get('accreditationBody') || ''),
    accreditationNumber: String(formData.get('accreditationNumber') || ''),
    qualifications: String(formData.get('qualifications') || ''),
    yearsExperience,
    hourlyRate,
    languages: String(formData.get('languages') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    locationText: String(formData.get('locationText') || ''),
    postcode: normalizePostcode(String(formData.get('postcode') || '')),
    remoteAvailable: String(formData.get('remoteAvailable') || 'false') === 'true',
    specialisms: String(formData.get('specialisms') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    bio: String(formData.get('bio') || ''),
    photoPath,
  })

  const adminEmail = process.env.REFERRAL_ADMIN_EMAIL
  if (adminEmail && process.env.RESEND_API_KEY) {
    const locale = coerceSupportedLocale(req.headers.get('x-fairsettle-locale'))
    await sendReferralAdminEmail({
      adminEmail,
      subject: 'New FairSettle specialist application',
      title: 'A specialist application is waiting for review',
      body: `Applicant: ${application.full_name}\nType: ${application.specialist_type}\nAccreditation: ${application.accreditation_body} (${application.accreditation_number})`,
      adminUrl: buildAppUrl('/admin/specialists', locale, getRequestOrigin(req)),
    }).catch(() => null)
  }

  if (application.email && process.env.RESEND_API_KEY) {
    const locale = coerceSupportedLocale(req.headers.get('x-fairsettle-locale'))
    await sendSpecialistApplicationReceivedEmail({
      userEmail: application.email,
      applyStatusUrl: buildAppUrl('/professional/apply', locale, getRequestOrigin(req)),
    }).catch(() => null)
  }

  return NextResponse.json({ application })
}
