ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

CREATE INDEX IF NOT EXISTS idx_referrals_stripe_session
ON public.referrals(stripe_checkout_session_id)
WHERE stripe_checkout_session_id IS NOT NULL;
