ALTER TABLE public.recommendations
ADD COLUMN IF NOT EXISTS last_follow_up_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS follow_up_sent_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_recommendations_follow_up
ON public.recommendations(last_follow_up_at, created_at);
