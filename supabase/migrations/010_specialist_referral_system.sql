BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'specialist_type'
  ) THEN
    CREATE TYPE public.specialist_type AS ENUM (
      'mediator',
      'solicitor',
      'financial_adviser',
      'pension_expert',
      'child_psychologist'
    );
  END IF;
END $$;

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS complexity_flags JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.specialist_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  specialist_type public.specialist_type NOT NULL,
  accreditation_body TEXT NOT NULL,
  accreditation_number TEXT NOT NULL,
  qualifications TEXT NOT NULL,
  years_experience INTEGER NOT NULL CHECK (years_experience >= 0),
  hourly_rate NUMERIC(10,2) NOT NULL CHECK (hourly_rate >= 0),
  languages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  location_text TEXT NOT NULL,
  postcode TEXT NOT NULL,
  postcode_normalized TEXT NOT NULL,
  remote_available BOOLEAN NOT NULL DEFAULT FALSE,
  specialisms TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  bio TEXT NOT NULL,
  photo_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  claimed_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.specialists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  application_id UUID UNIQUE REFERENCES public.specialist_applications(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  specialist_type public.specialist_type NOT NULL,
  accreditation_body TEXT NOT NULL,
  accreditation_number TEXT NOT NULL,
  qualifications TEXT NOT NULL,
  years_experience INTEGER NOT NULL CHECK (years_experience >= 0),
  hourly_rate NUMERIC(10,2) NOT NULL CHECK (hourly_rate >= 0),
  languages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  location_text TEXT NOT NULL,
  postcode TEXT NOT NULL,
  postcode_normalized TEXT NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  remote_available BOOLEAN NOT NULL DEFAULT FALSE,
  specialisms TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  bio TEXT NOT NULL,
  photo_path TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  verification_source TEXT,
  verification_notes TEXT,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  stripe_connect_id TEXT,
  stripe_connect_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (stripe_connect_status IN ('not_started', 'pending', 'completed', 'restricted')),
  rating_average NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.referral_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialist_type public.specialist_type NOT NULL,
  source TEXT NOT NULL
    CHECK (source IN ('resolution_cta', 'mediator_assist', 'marketplace', 'admin')),
  preferred_time_window TEXT,
  location_preference TEXT NOT NULL DEFAULT 'either'
    CHECK (location_preference IN ('remote', 'local', 'either')),
  location_text TEXT,
  postcode TEXT,
  postcode_normalized TEXT,
  message TEXT,
  source_export_id UUID REFERENCES public.exports(id) ON DELETE SET NULL,
  triage_status TEXT NOT NULL DEFAULT 'new'
    CHECK (triage_status IN ('new', 'reviewing', 'matched', 'closed', 'cancelled')),
  internal_notes TEXT,
  assigned_specialist_id UUID REFERENCES public.specialists(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  referral_request_id UUID REFERENCES public.referral_requests(id) ON DELETE SET NULL,
  specialist_id UUID NOT NULL REFERENCES public.specialists(id) ON DELETE CASCADE,
  requested_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  specialist_type public.specialist_type NOT NULL,
  source TEXT NOT NULL
    CHECK (source IN ('resolution_cta', 'mediator_assist', 'marketplace', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'session_scheduled', 'recommendation_submitted', 'completed', 'cancelled')),
  payment_model TEXT NOT NULL DEFAULT 'request_only'
    CHECK (payment_model IN ('request_only', 'mediator_assist', 'connect_checkout', 'solicitor_off_platform')),
  scheduled_for TIMESTAMPTZ,
  meeting_mode TEXT CHECK (meeting_mode IN ('video', 'phone', 'in_person')),
  meeting_link TEXT,
  meeting_instructions TEXT,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  payment_amount NUMERIC(10,2),
  platform_fee_amount NUMERIC(10,2),
  specialist_payout_amount NUMERIC(10,2),
  accepted_at TIMESTAMPTZ,
  recommendation_submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  specialist_id UUID NOT NULL REFERENCES public.specialists(id) ON DELETE CASCADE,
  overall_assessment TEXT,
  next_steps_recommendation TEXT,
  safeguarding_flag BOOLEAN NOT NULL DEFAULT FALSE,
  safeguarding_notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recommendation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL DEFAULT 'pending'
    CHECK (action IN ('pending', 'accept', 'modify', 'reject')),
  response_value JSONB,
  comment TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recommendation_id, item_key, user_id)
);

CREATE TABLE IF NOT EXISTS public.specialist_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  specialist_id UUID NOT NULL REFERENCES public.specialists(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referral_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.specialist_availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id UUID NOT NULL REFERENCES public.specialists(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT FALSE,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

ALTER TABLE public.specialist_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_applications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.specialists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_responses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_ratings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_availability_slots FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'specialists'
      AND policyname = 'specialists_public_select'
  ) THEN
    CREATE POLICY specialists_public_select
      ON public.specialists
      FOR SELECT
      USING (is_active = TRUE AND is_verified = TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'specialist_ratings'
      AND policyname = 'specialist_ratings_public_select'
  ) THEN
    CREATE POLICY specialist_ratings_public_select
      ON public.specialist_ratings
      FOR SELECT
      USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'specialist_availability_slots'
      AND policyname = 'specialist_availability_public_select'
  ) THEN
    CREATE POLICY specialist_availability_public_select
      ON public.specialist_availability_slots
      FOR SELECT
      USING (TRUE);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_specialist_applications_status
  ON public.specialist_applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_specialists_lookup
  ON public.specialists(specialist_type, is_active, is_verified);
CREATE INDEX IF NOT EXISTS idx_specialists_postcode
  ON public.specialists(postcode_normalized);
CREATE INDEX IF NOT EXISTS idx_referral_requests_case
  ON public.referral_requests(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_requests_status
  ON public.referral_requests(triage_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_case
  ON public.referrals(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_specialist
  ON public.referrals(specialist_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_case
  ON public.recommendations(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_responses_lookup
  ON public.recommendation_responses(case_id, recommendation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_specialist_ratings_specialist
  ON public.specialist_ratings(specialist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_specialist_availability_specialist
  ON public.specialist_availability_slots(specialist_id, starts_at);

INSERT INTO storage.buckets (id, name, public)
SELECT 'specialist-photos', 'specialist-photos', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'specialist-photos'
);

COMMENT ON COLUMN public.cases.complexity_flags IS 'Normalized specialist-referral complexity flags for the case.';

COMMIT;
