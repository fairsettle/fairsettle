-- ============================================================
-- FairSettle v3 — notification follow-ups
-- ============================================================

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS auto_generate_warning_sent_at TIMESTAMPTZ;
