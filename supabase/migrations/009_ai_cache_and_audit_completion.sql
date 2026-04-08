-- ============================================================
-- FairSettle AI cache + audit completion
-- Phase 4 follow-up
-- ============================================================

ALTER TABLE public.ai_logs
  ADD COLUMN IF NOT EXISTS input JSONB,
  ADD COLUMN IF NOT EXISTS request_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_logs_cache_lookup
  ON public.ai_logs(feature, case_id, request_hash, created_at DESC);
