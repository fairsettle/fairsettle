-- ============================================================
-- FairSettle Admin Dashboard Foundation
-- Web-only first release with future-ready source channel fields.
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_channel TEXT NOT NULL DEFAULT 'web';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_source_channel_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_source_channel_check
      CHECK (source_channel IN ('web', 'whatsapp'));
  END IF;
END $$;

UPDATE public.profiles
SET source_channel = 'web'
WHERE source_channel IS NULL;

-- ------------------------------------------------------------
-- CASES
-- ------------------------------------------------------------
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS source_channel TEXT NOT NULL DEFAULT 'web';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cases_source_channel_check'
  ) THEN
    ALTER TABLE public.cases
      ADD CONSTRAINT cases_source_channel_check
      CHECK (source_channel IN ('web', 'whatsapp'));
  END IF;
END $$;

UPDATE public.cases
SET source_channel = 'web'
WHERE source_channel IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_source_channel ON public.profiles(source_channel);
CREATE INDEX IF NOT EXISTS idx_cases_source_channel ON public.cases(source_channel);

-- ------------------------------------------------------------
-- SENTIMENT REVIEW METADATA
-- ------------------------------------------------------------
ALTER TABLE public.sentiment_logs
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sentiment_logs_reviewed_at ON public.sentiment_logs(reviewed_at);

-- ------------------------------------------------------------
-- SIGNUP TRIGGER
-- Keep profile creation in sync with new admin/channel fields.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    preferred_language,
    role,
    source_channel,
    is_admin
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
    NULL,
    COALESCE(NEW.raw_user_meta_data->>'source_channel', 'web'),
    FALSE
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        preferred_language = EXCLUDED.preferred_language,
        source_channel = COALESCE(public.profiles.source_channel, EXCLUDED.source_channel);

  RETURN NEW;
END;
$$;
