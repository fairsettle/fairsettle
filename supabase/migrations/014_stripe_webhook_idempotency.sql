DROP INDEX IF EXISTS public.idx_referrals_stripe_session;

CREATE UNIQUE INDEX IF NOT EXISTS referrals_stripe_checkout_session_id_key
ON public.referrals(stripe_checkout_session_id)
WHERE stripe_checkout_session_id IS NOT NULL;
