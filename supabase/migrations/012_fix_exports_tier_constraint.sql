BEGIN;

ALTER TABLE public.exports
  DROP CONSTRAINT IF EXISTS exports_tier_check;

ALTER TABLE public.exports
  ADD CONSTRAINT exports_tier_check
  CHECK (tier IN ('standard', 'resolution', 'mediator_assist'));

COMMIT;
