-- ============================================================
-- FairSettle AI Integration Foundation
-- Phase 4 (web-only, no WhatsApp bot)
-- ============================================================

-- ------------------------------------------------------------
-- AI audit log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_estimate REAL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_logs_case ON public.ai_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_feature_created_at
  ON public.ai_logs(feature, created_at DESC);

-- ------------------------------------------------------------
-- Cached AI translations for question guidance
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  adapted_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(question_id, language)
);

ALTER TABLE public.ai_translations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_translations'
      AND policyname = 'translations_public_select'
  ) THEN
    CREATE POLICY translations_public_select
      ON public.ai_translations
      FOR SELECT
      USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_translations_lookup
  ON public.ai_translations(question_id, language);

-- ------------------------------------------------------------
-- Richer sentiment metadata for deep analysis
-- ------------------------------------------------------------
ALTER TABLE public.sentiment_logs
  ADD COLUMN IF NOT EXISTS risk_level TEXT,
  ADD COLUMN IF NOT EXISTS recommended_action TEXT,
  ADD COLUMN IF NOT EXISTS ai_explanation TEXT,
  ADD COLUMN IF NOT EXISTS ai_patterns JSONB,
  ADD COLUMN IF NOT EXISTS deep_analysis_model TEXT,
  ADD COLUMN IF NOT EXISTS deep_analysis_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sentiment_logs_case_user_created_at
  ON public.sentiment_logs(case_id, user_id, created_at DESC);
