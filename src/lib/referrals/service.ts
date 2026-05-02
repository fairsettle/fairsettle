import 'server-only'

import { getNarrativeSummaryForCase } from '@/lib/ai/narratives'
import { getResolutionPayload } from '@/lib/ai/resolution'
import { buildSafeComparisonPayload } from '@/lib/comparison'
import { answersMatch } from '@/lib/comparison'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/timeline'
import type { Database, Json } from '@/types/database'
import type {
  CaseComplexityFlag,
  MarketplaceSpecialistCard,
  RecommendationItemInput,
  RecommendationResponseAction,
  RecommendationNextStep,
  ReferralLocationPreference,
  ReferralMeetingMode,
  ReferralRequestInput,
  ReferralRequestSource,
  ReferralRequestStatus,
  ReferralStatus,
  SpecialistApplicationInput,
  SpecialistType,
  VisibleSpecialistType,
} from '@/types/referrals'

type SpecialistRow = Database['public']['Tables']['specialists']['Row']

const DEFAULT_RADIUS_MILES = Number(process.env.SPECIALIST_DEFAULT_RADIUS_MILES ?? '25')

export function normalizePostcode(input: string) {
  return input.replace(/\s+/g, '').toUpperCase()
}

export function formatPostcode(input: string) {
  const normalized = normalizePostcode(input)
  if (normalized.length <= 3) {
    return normalized
  }

  return `${normalized.slice(0, -3)} ${normalized.slice(-3)}`
}

export async function geocodeUkPostcode(postcode: string) {
  const normalized = normalizePostcode(postcode)

  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`, {
      next: { revalidate: 60 * 60 * 24 },
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as {
      status: number
      result?: {
        postcode: string
        latitude: number
        longitude: number
      }
    }

    if (payload.status !== 200 || !payload.result) {
      return null
    }

    return {
      postcode: payload.result.postcode,
      postcodeNormalized: normalized,
      latitude: payload.result.latitude,
      longitude: payload.result.longitude,
    }
  } catch {
    return null
  }
}

function deg2rad(value: number) {
  return value * (Math.PI / 180)
}

export function haversineMiles(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const earthRadiusMiles = 3958.8
  const deltaLatitude = deg2rad(latitudeB - latitudeA)
  const deltaLongitude = deg2rad(longitudeB - longitudeA)
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(deg2rad(latitudeA)) *
      Math.cos(deg2rad(latitudeB)) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2)

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getPhotoUrl(photoPath: string | null) {
  if (!photoPath) {
    return null
  }

  const { data } = supabaseAdmin.storage.from('specialist-photos').getPublicUrl(photoPath)
  return data.publicUrl
}

async function getSignedCaseDocumentUrl(filePath: string | null) {
  if (!filePath) {
    return null
  }

  const { data, error } = await supabaseAdmin.storage
    .from('case-documents')
    .createSignedUrl(filePath, 60 * 60)

  if (error) {
    return null
  }

  return data.signedUrl
}

function toVisibleSpecialistType(type: SpecialistType): VisibleSpecialistType | null {
  if (type === 'mediator' || type === 'solicitor') {
    return type
  }

  return null
}

export async function createReferralRequest({
  caseId,
  requesterUserId,
  specialistType,
  source,
  preferredTimeWindow,
  locationPreference,
  locationText,
  postcode,
  message,
  sourceExportId,
}: ReferralRequestInput & {
  requesterUserId: string
  source: ReferralRequestSource
  sourceExportId?: string | null
}) {
  const postcodeNormalized = postcode ? normalizePostcode(postcode) : null
  const insertPayload: Database['public']['Tables']['referral_requests']['Insert'] = {
    case_id: caseId,
    requester_user_id: requesterUserId,
    specialist_type: specialistType,
    source,
    preferred_time_window: preferredTimeWindow || null,
    location_preference: locationPreference,
    location_text: locationText || null,
    postcode: postcode ? formatPostcode(postcode) : null,
    postcode_normalized: postcodeNormalized,
    message: message || null,
    source_export_id: sourceExportId ?? null,
  }

  const { data, error } = await supabaseAdmin
    .from('referral_requests')
    .insert(insertPayload)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to create referral request')
  }

  await logEvent(caseId, 'resolution_modified', requesterUserId, {
    referral_request_id: data.id,
    specialist_type: specialistType,
    source,
  }).catch(() => null)

  return data
}

export async function createSpecialistApplication(
  input: SpecialistApplicationInput,
) {
  const postcodeNormalized = normalizePostcode(input.postcode)

  const { data, error } = await supabaseAdmin
    .from('specialist_applications')
    .insert({
      full_name: input.fullName,
      email: input.email,
      specialist_type: input.specialistType,
      accreditation_body: input.accreditationBody,
      accreditation_number: input.accreditationNumber,
      qualifications: input.qualifications,
      years_experience: input.yearsExperience,
      hourly_rate: input.hourlyRate,
      languages: input.languages,
      location_text: input.locationText,
      postcode: formatPostcode(input.postcode),
      postcode_normalized: postcodeNormalized,
      remote_available: input.remoteAvailable,
      specialisms: input.specialisms,
      bio: input.bio,
      photo_path: input.photoPath ?? null,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to submit application')
  }

  return data
}

export async function listMarketplaceSpecialists({
  specialistType,
  language,
  specialism,
  remoteOnly,
  postcode,
  radiusMiles = DEFAULT_RADIUS_MILES,
  nextAvailableOnly,
}: {
  specialistType?: VisibleSpecialistType | 'all'
  language?: string | 'all'
  specialism?: string
  remoteOnly?: boolean
  postcode?: string
  radiusMiles?: number
  nextAvailableOnly?: boolean
}): Promise<MarketplaceSpecialistCard[]> {
  let query = supabaseAdmin
    .from('specialists')
    .select('*')
    .eq('is_active', true)
    .eq('is_verified', true)
    .in('specialist_type', ['mediator', 'solicitor'])
    .order('approved_at', { ascending: false })

  if (specialistType && specialistType !== 'all') {
    query = query.eq('specialist_type', specialistType)
  }

  if (remoteOnly) {
    query = query.eq('remote_available', true)
  }

  if (language && language !== 'all') {
    query = query.contains('languages', [language])
  }

  if (specialism) {
    query = query.contains('specialisms', [specialism])
  }

  const [{ data: specialists, error }, targetCoordinates] = await Promise.all([
    query,
    postcode ? geocodeUkPostcode(postcode) : Promise.resolve(null),
  ])

  if (error) {
    throw new Error(error.message)
  }

  const specialistIds = (specialists ?? []).map((item) => item.id)
  const { data: slots } = specialistIds.length
    ? await supabaseAdmin
        .from('specialist_availability_slots')
        .select('id, specialist_id, starts_at, ends_at, is_booked')
        .in('specialist_id', specialistIds)
        .eq('is_booked', false)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
    : { data: [] as { specialist_id: string; starts_at: string }[] }

  const nextSlotMap = new Map<string, string>()
  for (const slot of slots ?? []) {
    if (!nextSlotMap.has(slot.specialist_id)) {
      nextSlotMap.set(slot.specialist_id, slot.starts_at)
    }
  }

  return (specialists ?? [])
    .map((specialist) => {
      const visibleType = toVisibleSpecialistType(specialist.specialist_type)
      if (!visibleType) {
        return null
      }

      let distanceMiles: number | null = null
      if (
        targetCoordinates &&
        specialist.latitude !== null &&
        specialist.longitude !== null
      ) {
        distanceMiles = haversineMiles(
          Number(targetCoordinates.latitude),
          Number(targetCoordinates.longitude),
          Number(specialist.latitude),
          Number(specialist.longitude),
        )
      }

      if (distanceMiles !== null && distanceMiles > radiusMiles) {
        return null
      }

      const nextAvailability = nextSlotMap.get(specialist.id) ?? null
      if (nextAvailableOnly && !nextAvailability) {
        return null
      }

      return {
        id: specialist.id,
        fullName: specialist.full_name,
        specialistType: visibleType,
        accreditationBody: specialist.accreditation_body,
        qualifications: specialist.qualifications,
        yearsExperience: specialist.years_experience,
        hourlyRate: Number(specialist.hourly_rate),
        languages: specialist.languages,
        specialisms: specialist.specialisms,
        locationText: specialist.location_text,
        postcode: specialist.postcode,
        remoteAvailable: specialist.remote_available,
        bio: specialist.bio,
        photoUrl: getPhotoUrl(specialist.photo_path),
        ratingAverage: Number(specialist.rating_average ?? 0),
        ratingCount: specialist.rating_count ?? 0,
        nextAvailability,
        distanceMiles,
      } satisfies MarketplaceSpecialistCard
    })
    .filter((item): item is MarketplaceSpecialistCard => Boolean(item))
}

export async function getSpecialistById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('specialists')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .eq('is_verified', true)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  const [{ data: slots }, { data: ratings }] = await Promise.all([
    supabaseAdmin
      .from('specialist_availability_slots')
      .select('id, starts_at, ends_at')
      .eq('specialist_id', id)
      .eq('is_booked', false)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(3),
    supabaseAdmin
      .from('specialist_ratings')
      .select('id, rating, review_text, created_at')
      .eq('specialist_id', id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return {
    ...data,
    photo_url: getPhotoUrl(data.photo_path),
    next_availability: slots?.[0]?.starts_at ?? null,
    availability_slots: slots ?? [],
    recent_ratings: ratings ?? [],
  }
}

export async function listReferralRequestsForAdmin() {
  const { data, error } = await supabaseAdmin
    .from('referral_requests')
    .select('*, cases(id, case_type, created_at), specialists(id, full_name), profiles!referral_requests_requester_user_id_fkey(id, full_name, email)')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function getReferralAdminSummary() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ count: requestCount }, { count: referralCount }, { count: mediatorAssistCount }, { count: marketplaceCount }, { count: solicitorCount }, { data: staleRecommendations }] =
    await Promise.all([
      supabaseAdmin.from('referral_requests').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('referrals').select('*', { count: 'exact', head: true }),
      supabaseAdmin
        .from('referral_requests')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'mediator_assist'),
      supabaseAdmin
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('payment_model', 'connect_checkout'),
      supabaseAdmin
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('specialist_type', 'solicitor'),
      supabaseAdmin
        .from('recommendations')
        .select('id, recommendation_responses(action)')
        .lte('created_at', sevenDaysAgo),
    ])

  const stalledCount = ((staleRecommendations ?? []) as Array<{ recommendation_responses?: Array<{ action: string }> }>).filter((recommendation) =>
    (recommendation.recommendation_responses ?? []).some((response) => response.action === 'pending'),
  ).length

  return {
    requestCount: requestCount ?? 0,
    referralCount: referralCount ?? 0,
    mediatorAssistCount: mediatorAssistCount ?? 0,
    marketplaceCount: marketplaceCount ?? 0,
    solicitorCount: solicitorCount ?? 0,
    stalledCount,
  }
}

export async function listSpecialistApplicationsForAdmin() {
  const { data, error } = await supabaseAdmin
    .from('specialist_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function approveSpecialistApplication({
  applicationId,
  adminUserId,
  verificationSource,
  verificationNotes,
  profileId,
}: {
  applicationId: string
  adminUserId: string
  verificationSource: string
  verificationNotes?: string
  profileId?: string | null
}) {
  const { data: application, error: fetchError } = await supabaseAdmin
    .from('specialist_applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle()

  if (fetchError || !application) {
    throw new Error(fetchError?.message ?? 'Application not found')
  }

  const geocoded = await geocodeUkPostcode(application.postcode)
  const now = new Date().toISOString()

  const { data: specialist, error: specialistError } = await supabaseAdmin
    .from('specialists')
    .insert({
      profile_id: profileId ?? null,
      application_id: application.id,
      full_name: application.full_name,
      email: application.email,
      specialist_type: application.specialist_type,
      accreditation_body: application.accreditation_body,
      accreditation_number: application.accreditation_number,
      qualifications: application.qualifications,
      years_experience: application.years_experience,
      hourly_rate: application.hourly_rate,
      languages: application.languages,
      location_text: application.location_text,
      postcode: application.postcode,
      postcode_normalized: application.postcode_normalized,
      latitude: geocoded?.latitude ?? null,
      longitude: geocoded?.longitude ?? null,
      remote_available: application.remote_available,
      specialisms: application.specialisms,
      bio: application.bio,
      photo_path: application.photo_path,
      is_verified: true,
      is_active: true,
      verification_source: verificationSource,
      verification_notes: verificationNotes ?? null,
      approved_by: adminUserId,
      approved_at: now,
    })
    .select('*')
    .single()

  if (specialistError || !specialist) {
    throw new Error(specialistError?.message ?? 'Unable to approve specialist')
  }

  const { error: updateError } = await supabaseAdmin
    .from('specialist_applications')
    .update({
      status: 'approved',
      review_notes: verificationNotes ?? null,
      reviewed_by: adminUserId,
      reviewed_at: now,
      claimed_profile_id: profileId ?? null,
    })
    .eq('id', applicationId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  return specialist
}

export async function rejectSpecialistApplication({
  applicationId,
  adminUserId,
  reviewNotes,
}: {
  applicationId: string
  adminUserId: string
  reviewNotes: string
}) {
  const { error } = await supabaseAdmin
    .from('specialist_applications')
    .update({
      status: 'rejected',
      review_notes: reviewNotes,
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', applicationId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function updateReferralRequestTriage({
  requestId,
  triageStatus,
  internalNotes,
  specialistId,
}: {
  requestId: string
  triageStatus: ReferralRequestStatus
  internalNotes?: string
  specialistId?: string | null
}) {
  const { data, error } = await supabaseAdmin
    .from('referral_requests')
    .update({
      triage_status: triageStatus,
      internal_notes: internalNotes ?? null,
      assigned_specialist_id: specialistId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to update referral request')
  }

  return data
}

export async function createReferral({
  caseId,
  referralRequestId,
  specialistId,
  requestedByUserId,
  source,
  paymentModel,
  stripeCheckoutSessionId,
  stripePaymentIntentId,
  paymentAmount,
  platformFeeAmount,
  specialistPayoutAmount,
}: {
  caseId: string
  referralRequestId?: string | null
  specialistId: string
  requestedByUserId?: string | null
  source: ReferralRequestSource
  paymentModel: 'request_only' | 'mediator_assist' | 'connect_checkout' | 'solicitor_off_platform'
  stripeCheckoutSessionId?: string | null
  stripePaymentIntentId?: string | null
  paymentAmount?: number | null
  platformFeeAmount?: number | null
  specialistPayoutAmount?: number | null
}) {
  const { data: specialist, error: specialistError } = await supabaseAdmin
    .from('specialists')
    .select('id, specialist_type')
    .eq('id', specialistId)
    .maybeSingle()

  if (specialistError || !specialist) {
    throw new Error(specialistError?.message ?? 'Specialist not found')
  }

  const { data, error } = await supabaseAdmin
    .from('referrals')
    .insert({
      case_id: caseId,
      referral_request_id: referralRequestId ?? null,
      specialist_id: specialistId,
      requested_by_user_id: requestedByUserId ?? null,
      specialist_type: specialist.specialist_type,
      source,
      payment_model: paymentModel,
      stripe_checkout_session_id: stripeCheckoutSessionId ?? null,
      stripe_payment_intent_id: stripePaymentIntentId ?? null,
      payment_amount: paymentAmount ?? null,
      platform_fee_amount: platformFeeAmount ?? null,
      specialist_payout_amount: specialistPayoutAmount ?? null,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to create referral')
  }

  return data
}

export async function scheduleReferral({
  referralId,
  status,
  scheduledFor,
  meetingMode,
  meetingLink,
  meetingInstructions,
}: {
  referralId: string
  status: ReferralStatus
  scheduledFor?: string | null
  meetingMode?: ReferralMeetingMode | null
  meetingLink?: string | null
  meetingInstructions?: string | null
}) {
  const payload: Database['public']['Tables']['referrals']['Update'] = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (scheduledFor !== undefined) {
    payload.scheduled_for = scheduledFor
  }
  if (meetingMode !== undefined) {
    payload.meeting_mode = meetingMode
  }
  if (meetingLink !== undefined) {
    payload.meeting_link = meetingLink
  }
  if (meetingInstructions !== undefined) {
    payload.meeting_instructions = meetingInstructions
  }
  if (status === 'accepted') {
    payload.accepted_at = new Date().toISOString()
  }
  if (status === 'completed') {
    payload.completed_at = new Date().toISOString()
  }
  if (status === 'cancelled') {
    payload.cancelled_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from('referrals')
    .update(payload)
    .eq('id', referralId)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to schedule referral')
  }

  return data
}

export async function listProfessionalReferrals(specialistId: string) {
  const { data, error } = await supabaseAdmin
    .from('referrals')
    .select('*, referral_requests(*), cases(*)')
    .eq('specialist_id', specialistId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function getProfessionalCaseView(caseId: string, specialistId: string, locale = 'en') {
  const { data: referrals, error: referralError } = await supabaseAdmin
    .from('referrals')
    .select('*, referral_requests(*)')
    .eq('case_id', caseId)
    .eq('specialist_id', specialistId)
    .order('created_at', { ascending: false })
    .limit(1)

  const referral = referrals?.[0] ?? null

  if (referralError || !referral) {
    throw new Error(referralError?.message ?? 'Referral not found')
  }

  const { data: caseItem, error: caseError } = await supabaseAdmin
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .maybeSingle()

  if (caseError || !caseItem || !caseItem.responder_id) {
    throw new Error(caseError?.message ?? 'Case not found')
  }

  const [comparisonPayload, resolutionPayload, narrativeSummary, { data: documents }, { data: sentimentLogs }, { data: timeline }] =
    await Promise.all([
      buildSafeComparisonPayload({
        caseType: caseItem.case_type,
        caseId,
        initiatorId: caseItem.initiator_id,
        responderId: caseItem.responder_id,
        viewerRole: 'initiator',
        questionSetVersion: caseItem.question_set_version,
      }),
      getResolutionPayload({
        caseId,
        viewerUserId: caseItem.initiator_id,
        locale,
      }),
      getNarrativeSummaryForCase({
        caseId,
        viewerUserId: caseItem.initiator_id,
        locale,
      }),
      supabaseAdmin.from('documents').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
      supabaseAdmin.from('sentiment_logs').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
      supabaseAdmin.from('case_timeline').select('*').eq('case_id', caseId).order('created_at', { ascending: false }).limit(12),
    ])

  const documentsWithUrls = await Promise.all(
    (documents ?? []).map(async (document) => ({
      ...document,
      signed_url: await getSignedCaseDocumentUrl(document.file_path),
    })),
  )

  const agreedCount = comparisonPayload.summary.agreed_count
  const unresolvedCount = comparisonPayload.summary.unresolved_count + comparisonPayload.summary.disputed_count
  const cooperationSummary =
    agreedCount > unresolvedCount
      ? 'The case currently shows more areas of alignment than unresolved conflict, which suggests the parties may be able to act on a focused recommendation.'
      : 'The case still has a high level of unresolved conflict, so the recommendation should prioritise practical next steps and narrowing the live points of disagreement.'

  return {
    referral,
    caseItem,
    comparison: comparisonPayload,
    documents: documentsWithUrls,
    sentimentLogs: sentimentLogs ?? [],
    timeline: timeline ?? [],
    narrativeSummary,
    resolution: resolutionPayload,
    cooperationSummary,
  }
}

export async function submitRecommendation({
  referralId,
  caseId,
  specialistId,
  items,
  overallAssessment,
  nextStepsRecommendation,
  safeguardingFlag,
  safeguardingNotes,
}: {
  referralId: string
  caseId: string
  specialistId: string
  items: RecommendationItemInput[]
  overallAssessment: string
  nextStepsRecommendation: RecommendationNextStep
  safeguardingFlag: boolean
  safeguardingNotes?: string
}) {
  const { data: recommendation, error } = await supabaseAdmin
    .from('recommendations')
    .insert({
      referral_id: referralId,
      case_id: caseId,
      specialist_id: specialistId,
      overall_assessment: overallAssessment,
      next_steps_recommendation: nextStepsRecommendation,
      safeguarding_flag: safeguardingFlag,
      safeguarding_notes: safeguardingNotes ?? null,
      items: items as unknown as Json,
      submitted_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error || !recommendation) {
    throw new Error(error?.message ?? 'Unable to submit recommendation')
  }

  const { data: caseRow } = await supabaseAdmin
    .from('cases')
    .select('initiator_id, responder_id')
    .eq('id', caseId)
    .single()

  if (caseRow?.responder_id) {
    const rows: Database['public']['Tables']['recommendation_responses']['Insert'][] = []
    for (const item of items) {
      rows.push({
        recommendation_id: recommendation.id,
        referral_id: referralId,
        case_id: caseId,
        item_key: item.item_key,
        question_id: item.question_id,
        child_id: item.child_id ?? null,
        user_id: caseRow.initiator_id,
      })
      rows.push({
        recommendation_id: recommendation.id,
        referral_id: referralId,
        case_id: caseId,
        item_key: item.item_key,
        question_id: item.question_id,
        child_id: item.child_id ?? null,
        user_id: caseRow.responder_id,
      })
    }

    const { error: responsesError } = await supabaseAdmin
      .from('recommendation_responses')
      .insert(rows)

    if (responsesError) {
      throw new Error(responsesError.message)
    }
  }

  await scheduleReferral({
    referralId,
    status: 'recommendation_submitted',
  })

  return recommendation
}

async function syncAcceptedRecommendationToCaseState({
  caseId,
  itemKey,
  questionId,
  childId,
  acceptedValue,
  actorUserId,
}: {
  caseId: string
  itemKey: string
  questionId: string
  childId: string | null
  acceptedValue: Json
  actorUserId: string
}) {
  const { data: state, error: stateError } = await supabaseAdmin
    .from('case_item_states')
    .select('*')
    .eq('case_id', caseId)
    .eq('item_key', itemKey)
    .maybeSingle()

  if (stateError || !state) {
    throw new Error(stateError?.message ?? 'Case item state not found')
  }

  const nextState: Database['public']['Tables']['case_item_states']['Update'] = {
    initiator_status: 'accepted',
    responder_status: 'accepted',
    initiator_value: acceptedValue,
    responder_value: acceptedValue,
    review_bucket: 'locked',
    locked_at: new Date().toISOString(),
    unresolved_at: null,
  }

  const { error: updateError } = await supabaseAdmin
    .from('case_item_states')
    .update(nextState)
    .eq('id', state.id)

  if (updateError) {
    throw new Error(updateError.message)
  }

  const eventRows: Database['public']['Tables']['case_item_events']['Insert'][] = [
    {
      case_id: caseId,
      item_key: itemKey,
      question_id: questionId,
      child_id: childId,
      actor_user_id: actorUserId,
      action: 'accept',
      proposed_value: acceptedValue,
    },
    {
      case_id: caseId,
      item_key: itemKey,
      question_id: questionId,
      child_id: childId,
      actor_user_id: null,
      action: 'lock',
      proposed_value: acceptedValue,
    },
  ]

  await supabaseAdmin.from('case_item_events').insert(eventRows)
}

export async function respondToRecommendation({
  recommendationId,
  responseId,
  userId,
  action,
  responseValue,
  comment,
}: {
  recommendationId: string
  responseId: string
  userId: string
  action: Exclude<RecommendationResponseAction, 'pending'>
  responseValue?: Json | null
  comment?: string
}) {
  const now = new Date().toISOString()
  const { data: response, error } = await supabaseAdmin
    .from('recommendation_responses')
    .update({
      action,
      response_value: responseValue ?? null,
      comment: comment ?? null,
      responded_at: now,
      updated_at: now,
    })
    .eq('id', responseId)
    .eq('recommendation_id', recommendationId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error || !response) {
    throw new Error(error?.message ?? 'Unable to save recommendation response')
  }

  if (action === 'accept') {
    const { data: siblingResponses } = await supabaseAdmin
      .from('recommendation_responses')
      .select('*')
      .eq('recommendation_id', recommendationId)
      .eq('item_key', response.item_key)

    const allAccepted = (siblingResponses ?? []).every((item) => item.action === 'accept')
    const acceptedValues = (siblingResponses ?? [])
      .map((item) => item.response_value)
      .filter((value): value is Json => value !== null)

    const sameAcceptedValue =
      acceptedValues.length > 1 &&
      answersMatch(acceptedValues[0] as Json, acceptedValues[acceptedValues.length - 1] as Json)

    if (allAccepted && sameAcceptedValue && acceptedValues[0]) {
      await syncAcceptedRecommendationToCaseState({
        caseId: response.case_id,
        itemKey: response.item_key,
        questionId: response.question_id,
        childId: response.child_id,
        acceptedValue: acceptedValues[0],
        actorUserId: userId,
      })
    }
  }

  return response
}

export async function createSpecialistRating({
  referralId,
  specialistId,
  caseId,
  userId,
  rating,
  reviewText,
}: {
  referralId: string
  specialistId: string
  caseId: string
  userId: string
  rating: number
  reviewText?: string
}) {
  const { data, error } = await supabaseAdmin
    .from('specialist_ratings')
    .upsert(
      {
        referral_id: referralId,
        specialist_id: specialistId,
        case_id: caseId,
        user_id: userId,
        rating,
        review_text: reviewText ?? null,
      },
      { onConflict: 'referral_id,user_id' },
    )
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to save rating')
  }

  await recalculateSpecialistRating(specialistId)
  return data
}

export async function recalculateSpecialistRating(specialistId: string) {
  const { data: ratings, error } = await supabaseAdmin
    .from('specialist_ratings')
    .select('rating')
    .eq('specialist_id', specialistId)

  if (error) {
    throw new Error(error.message)
  }

  const values = (ratings ?? []).map((item) => item.rating)
  const count = values.length
  const average = count ? values.reduce((sum, value) => sum + value, 0) / count : 0

  await supabaseAdmin
    .from('specialists')
    .update({
      rating_average: average,
      rating_count: count,
      updated_at: new Date().toISOString(),
    })
    .eq('id', specialistId)
}

function getNumberFromAnswer(answer: Json | null) {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
    return null
  }

  if ('value' in answer && typeof answer.value === 'number') {
    return answer.value
  }

  return null
}

export async function computeCaseComplexityFlags(caseId: string): Promise<CaseComplexityFlag[]> {
  const [
    caseResult,
    comparisonCaseResult,
    highRiskSentimentResult,
    unresolvedResult,
    responsesResult,
    questionsResult,
  ] = await Promise.all([
    supabaseAdmin.from('cases').select('*').eq('id', caseId).maybeSingle(),
    supabaseAdmin.from('cases').select('case_type, initiator_id, responder_id, question_set_version, created_at, status').eq('id', caseId).maybeSingle(),
    supabaseAdmin
      .from('sentiment_logs')
      .select('id')
      .eq('case_id', caseId)
      .in('risk_level', ['high', 'critical'])
      .limit(1),
    supabaseAdmin
      .from('case_item_states')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', caseId)
      .in('review_bucket', ['disputed', 'unresolved']),
    supabaseAdmin
      .from('responses')
      .select('question_id, answer_value')
      .eq('case_id', caseId)
      .not('submitted_at', 'is', null),
    supabaseAdmin
      .from('questions')
      .select('id, question_text, section, dispute_type')
      .eq('is_active', true),
  ])

  if (!caseResult.data || !comparisonCaseResult.data) {
    return []
  }

  const questionsById = new Map((questionsResult.data ?? []).map((item) => [item.id, item]))
  const flags: CaseComplexityFlag[] = []

  const addFlag = (flag: CaseComplexityFlag) => {
    if (!flags.some((item) => item.key === flag.key)) {
      flags.push(flag)
    }
  }

  const incomeResponses = (responsesResult.data ?? []).filter((response) => {
    const question = questionsById.get(response.question_id)
    const text = JSON.stringify(question?.question_text ?? '').toLowerCase()
    return text.includes('income') || text.includes('salary') || question?.section.toLowerCase().includes('income')
  })

  const numericValues = incomeResponses
    .map((response) => getNumberFromAnswer(response.answer_value))
    .filter((value): value is number => value !== null)
    .sort((a, b) => b - a)

  if (numericValues.length >= 2 && numericValues[0] >= numericValues[1] * 2) {
    addFlag({
      key: 'significant_income_disparity',
      severity: 'high',
      reason: 'The submitted financial answers suggest one party earns at least twice as much as the other.',
      recommended_specialist_type: 'solicitor',
    })
  }

  for (const response of responsesResult.data ?? []) {
    const question = questionsById.get(response.question_id)
    const text = JSON.stringify(question?.question_text ?? '').toLowerCase()
    const valueText = JSON.stringify(response.answer_value).toLowerCase()

    if (text.includes('business')) {
      addFlag({
        key: 'business_ownership',
        severity: 'high',
        reason: 'The case includes business-related assets or ownership questions.',
        recommended_specialist_type: 'solicitor',
      })
    }

    if (text.includes('pension')) {
      const numericValue = getNumberFromAnswer(response.answer_value)
      if ((numericValue ?? 0) >= 100000 || valueText.includes('high')) {
        addFlag({
          key: 'high_value_pension',
          severity: 'medium',
          reason: 'Pension information suggests a significant pension asset may need specialist review.',
          recommended_specialist_type: 'solicitor',
        })
      }
    }

    if (text.includes('property') || text.includes('home value') || text.includes('house value')) {
      addFlag({
        key: 'property_value_dispute',
        severity: 'medium',
        reason: 'Property-related answers suggest the home or real-estate position is material to the dispute.',
        recommended_specialist_type: 'solicitor',
      })
    }

    if (text.includes('international') || text.includes('abroad') || text.includes('outside the uk') || valueText.includes('overseas')) {
      addFlag({
        key: 'international_elements',
        severity: 'high',
        reason: 'The case appears to involve international arrangements or overseas links.',
        recommended_specialist_type: 'solicitor',
      })
    }
  }

  if ((highRiskSentimentResult.data ?? []).length > 0) {
    addFlag({
      key: 'safeguarding_concern',
      severity: 'critical',
      reason: 'Recent sentiment analysis indicates a high-risk safeguarding concern that should be reviewed quickly.',
      recommended_specialist_type: 'mediator',
    })
  }

  const createdAt = new Date(comparisonCaseResult.data.created_at).getTime()
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000
  if (
    Date.now() - createdAt >= fourteenDaysMs &&
    (comparisonCaseResult.data.status === 'active' || comparisonCaseResult.data.status === 'comparison')
  ) {
    addFlag({
      key: 'no_progress_after_14_days',
      severity: 'medium',
      reason: 'The case has been open for more than 14 days without a final resolution.',
      recommended_specialist_type: 'mediator',
    })
  }

  if ((unresolvedResult.count ?? 0) >= 4) {
    addFlag({
      key: 'extreme_positions',
      severity: 'medium',
      reason: 'A high number of unresolved or disputed items suggests the parties are still far apart.',
      recommended_specialist_type: 'mediator',
    })
  }

  await supabaseAdmin
    .from('cases')
    .update({
      complexity_flags: flags as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', caseId)

  return flags
}

export async function rankSpecialistsForCase({
  caseId,
  specialistType,
  preferredLanguage,
  postcode,
  locationPreference,
}: {
  caseId: string
  specialistType: VisibleSpecialistType
  preferredLanguage?: string | null
  postcode?: string | null
  locationPreference?: ReferralLocationPreference
}) {
  const [flags, specialists] = await Promise.all([
    computeCaseComplexityFlags(caseId),
    listMarketplaceSpecialists({
      specialistType,
      language: preferredLanguage ?? 'all',
      remoteOnly: locationPreference === 'remote',
      postcode: locationPreference === 'local' || locationPreference === 'either' ? postcode ?? undefined : undefined,
    }),
  ])

  return specialists
    .map((specialist) => {
      let score = 0
      if (preferredLanguage && specialist.languages.includes(preferredLanguage)) {
        score += 5
      }
      if (specialist.remoteAvailable && locationPreference === 'remote') {
        score += 3
      }
      if (specialist.nextAvailability) {
        score += 3
      }
      if (specialist.distanceMiles !== null) {
        score += Math.max(0, DEFAULT_RADIUS_MILES - specialist.distanceMiles) / 5
      }
      if (specialist.ratingCount > 0) {
        score += specialist.ratingAverage
      }
      if (flags.some((flag) => flag.recommended_specialist_type === specialist.specialistType)) {
        score += 4
      }

      return { specialist, score }
    })
    .sort((left, right) => right.score - left.score)
}
