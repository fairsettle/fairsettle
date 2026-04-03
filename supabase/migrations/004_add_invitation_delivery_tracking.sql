-- ============================================================
-- FairSettle MVP — Migration 004: Invitation Email Delivery Tracking
-- Adds provider-level delivery state for invitation emails.
-- ============================================================

ALTER TABLE public.invitations
  ADD COLUMN resend_email_id TEXT,
  ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'queued'
    CHECK (delivery_status IN ('queued', 'delivered', 'delivery_delayed', 'bounced', 'complained', 'failed')),
  ADD COLUMN delivery_last_event_at TIMESTAMPTZ,
  ADD COLUMN delivery_last_event_type TEXT,
  ADD COLUMN delivery_error TEXT;

CREATE INDEX idx_invitations_resend_email_id
  ON public.invitations(resend_email_id)
  WHERE resend_email_id IS NOT NULL;

COMMENT ON COLUMN public.invitations.resend_email_id IS 'Provider email id returned by Resend. Used to correlate delivery webhooks.';
COMMENT ON COLUMN public.invitations.delivery_status IS 'Provider delivery status for the latest invitation email.';
COMMENT ON COLUMN public.invitations.delivery_last_event_at IS 'Timestamp of the most recent Resend delivery webhook applied to this invitation.';
COMMENT ON COLUMN public.invitations.delivery_last_event_type IS 'Raw Resend webhook type, e.g. email.delivered or email.bounced.';
COMMENT ON COLUMN public.invitations.delivery_error IS 'Latest provider error/bounce reason, when applicable.';
