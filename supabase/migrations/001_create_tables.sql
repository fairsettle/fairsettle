-- ============================================================
-- FairSettle MVP — Migration 001: Create Tables
-- Run this first, before 002_rls_policies.sql and 003_seed_questions.sql
-- Supabase project must be in London (eu-west-2) region
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES
-- Extends auth.users. Auto-created by trigger on signup.
-- ============================================================
CREATE TABLE public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name            TEXT NOT NULL DEFAULT '',
  email                TEXT NOT NULL DEFAULT '',
  preferred_language   TEXT NOT NULL DEFAULT 'en',
  children_count       INTEGER CHECK (children_count >= 0 AND children_count <= 20),
  role                 TEXT CHECK (role IN ('initiator', 'responder')),
  privacy_consent      BOOLEAN NOT NULL DEFAULT FALSE,
  privacy_consent_at   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Extended user profiles. One row per auth.users entry.';
COMMENT ON COLUMN public.profiles.role IS 'initiator = started a case. responder = joined via invite. A user can be both across different cases.';
COMMENT ON COLUMN public.profiles.preferred_language IS 'ISO 639-1 code: en, pl, ro, ar. Drives UI locale for this user.';

-- ============================================================
-- CASES
-- Core case record. One case per dispute between two parties.
-- ============================================================
CREATE TABLE public.cases (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  responder_id   UUID REFERENCES public.profiles(id),
  -- responder_id is NULL until the invitation is accepted
  case_type      TEXT NOT NULL CHECK (case_type IN ('child', 'financial', 'asset', 'combined')),
  status         TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'invited', 'active', 'comparison', 'completed', 'expired')),
  -- Status lifecycle:
  -- draft      → Case created, Party A answering questions
  -- invited    → Party A submitted, invitation sent to Party B
  -- active     → Party B accepted invitation, both answering
  -- comparison → Both submitted, comparison view generated
  -- completed  → Export purchased and downloaded
  -- expired    → Party B never responded within 21 days
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cases IS 'Core case record. Each case is a dispute between two parents.';
COMMENT ON COLUMN public.cases.case_type IS 'combined = all three dispute types in sequence (most common).';

-- ============================================================
-- INVITATIONS
-- One invitation record per send attempt.
-- ============================================================
CREATE TABLE public.invitations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id            UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  method             TEXT NOT NULL CHECK (method IN ('email', 'sms', 'whatsapp')),
  recipient_contact  TEXT NOT NULL,
  -- email address for method='email', phone number (E.164) for sms/whatsapp
  token              TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  -- 64-character hex token used in invitation URL: /respond/{token}
  status             TEXT NOT NULL DEFAULT 'sent'
                     CHECK (status IN ('sent', 'opened', 'accepted', 'expired')),
  sent_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at          TIMESTAMPTZ,
  accepted_at        TIMESTAMPTZ,
  expires_at         TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '21 days',
  reminder_count     INTEGER NOT NULL DEFAULT 0,
  -- 0 = no reminders sent yet, 1 = 48h sent, 2 = 7d sent, 3 = 14d sent
  last_reminder_at   TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.invitations IS 'Invitation records. Auto-expires after 21 days. Cron job handles reminders.';
COMMENT ON COLUMN public.invitations.token IS '64-char hex token. Used in URL: /respond/{token}. Unique and cryptographically random.';

-- ============================================================
-- QUESTIONS
-- Master question bank. Populated entirely by 003_seed_questions.sql.
-- Never modified by application code — data-driven.
-- ============================================================
CREATE TABLE public.questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_type   TEXT NOT NULL CHECK (dispute_type IN ('child', 'financial', 'asset')),
  -- Note: 'combined' is not a dispute_type here. Combined cases load all three.
  section        TEXT NOT NULL,
  question_text  JSONB NOT NULL,
  -- Format: {"en": "Question text?", "pl": "Polish text?", "ro": "Romanian text?", "ar": "Arabic text?"}
  question_type  TEXT NOT NULL CHECK (question_type IN ('single_choice', 'multi_choice', 'number', 'text', 'date')),
  options        JSONB,
  -- Format: {"en": ["Option 1", "Option 2"]} — NULL for text/number/date questions
  display_order  INTEGER NOT NULL,
  guidance_text  JSONB,
  -- Format: {"en": "What courts typically decide..."} — NULL if no guidance for this question
  -- Rendered in amber box below the question when not null
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT questions_unique_order UNIQUE (dispute_type, display_order)
);

COMMENT ON TABLE public.questions IS 'Master question bank. Populated by 003_seed_questions.sql. Do not modify via application code.';
COMMENT ON COLUMN public.questions.question_text IS 'i18n JSONB. Application renders the key matching user preferred_language, fallback to en.';
COMMENT ON COLUMN public.questions.guidance_text IS 'The amber "What courts typically decide" box. NULL = do not show the box.';

-- ============================================================
-- RESPONSES
-- Each parent's answer to each question. One row per person per question.
-- ============================================================
CREATE TABLE public.responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id   UUID NOT NULL REFERENCES public.questions(id),
  answer_value  JSONB NOT NULL,
  -- Format by question_type:
  -- single_choice : {"value": "Option text selected"}
  -- multi_choice  : {"values": ["Option 1", "Option 3"]}
  -- number        : {"value": 1500} or {"value": 1500, "currency": "GBP"}
  -- text          : {"value": "Free text content"}
  -- date          : {"value": "2024-06-15"}
  version       INTEGER NOT NULL DEFAULT 1,
  -- Increments each time the user changes their answer.
  submitted_at  TIMESTAMPTZ,
  -- NULL = answer saved as draft. Set when user finalises all answers.
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT responses_unique_per_user_per_question UNIQUE (case_id, user_id, question_id)
);

COMMENT ON TABLE public.responses IS 'One row per parent per question. RLS ensures each user can only see their own rows.';
COMMENT ON COLUMN public.responses.submitted_at IS 'Set when user clicks final submit. NULL = still in draft.';
COMMENT ON COLUMN public.responses.version IS 'Increments on each update. Useful for audit purposes.';

-- ============================================================
-- CASE_TIMELINE
-- Immutable audit log. Records are never updated or deleted.
-- ============================================================
CREATE TABLE public.case_timeline (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id      UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.profiles(id),
  -- NULL for system-generated events (e.g. expiry by cron)
  event_type   TEXT NOT NULL CHECK (event_type IN (
    'case_created',
    'questions_started',
    'questions_completed',
    'invitation_sent',
    'invitation_opened',
    'invitation_accepted',
    'invitation_expired',
    'reminder_sent',
    'responder_started',
    'responder_completed',
    'comparison_generated',
    'resolution_accepted',
    'resolution_modified',
    'resolution_rejected',
    'document_uploaded',
    'export_purchased',
    'export_downloaded',
    'case_expired'
  )),
  event_data   JSONB NOT NULL DEFAULT '{}',
  -- Flexible metadata. Examples:
  -- invitation_sent: {"method": "email", "recipient_contact": "ex@email.com", "invitation_id": "uuid"}
  -- reminder_sent:   {"reminder_number": 1, "method": "email"}
  -- export_purchased: {"tier": "standard", "stripe_session_id": "cs_..."}
  -- resolution_accepted: {"question_id": "uuid"}
  -- resolution_modified: {"question_id": "uuid", "original_suggestion": "...", "modified_value": "..."}
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at. Timeline events are immutable.
);

COMMENT ON TABLE public.case_timeline IS 'Immutable audit log. Never update or delete rows. Every action creates a new row.';

-- ============================================================
-- DOCUMENTS
-- Evidence files uploaded by either party.
-- Files stored in Supabase Storage bucket: case-documents
-- ============================================================
CREATE TABLE public.documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_path   TEXT NOT NULL,
  -- Supabase Storage path: cases/{case_id}/{user_id}/{timestamp}_{original_filename}
  file_name   TEXT NOT NULL,
  -- Original filename to display to user
  file_size   INTEGER NOT NULL CHECK (file_size > 0),
  -- File size in bytes
  mime_type   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.documents IS 'Evidence files. Storage bucket: case-documents (private). Access via signed URLs only.';

-- ============================================================
-- EXPORTS
-- Generated PDF export records. Created when Stripe payment confirmed.
-- Files stored in Supabase Storage bucket: case-exports
-- ============================================================
CREATE TABLE public.exports (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id            UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  export_type        TEXT NOT NULL CHECK (export_type IN ('full_case', 'single_party')),
  tier               TEXT NOT NULL CHECK (tier IN ('standard', 'resolution')),
  file_path          TEXT NOT NULL,
  -- Supabase Storage path: exports/{case_id}/{tier}_{timestamp}.pdf
  stripe_session_id  TEXT,
  -- Stripe checkout session ID. NULL for single-party exports (no payment required).
  is_single_party    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.exports IS 'Generated PDF exports. Created by Stripe webhook handler. Storage bucket: case-exports (private).';

-- ============================================================
-- SENTIMENT_LOGS
-- Private tone monitoring records. Never shown to the other party.
-- Auto-purged after 12 months.
-- ============================================================
CREATE TABLE public.sentiment_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id          UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  field_name       TEXT NOT NULL,
  -- Which question/field this was typed into (e.g., 'q_17_concerns')
  submitted_text   TEXT,
  -- Text that was actually submitted
  deleted_text     TEXT,
  -- Text that was typed and then deleted before submitting (captures hostile content)
  sentiment_score  FLOAT CHECK (sentiment_score >= 0.0 AND sentiment_score <= 1.0),
  -- OpenAI moderation score: 0.0 = clean, 1.0 = highest risk
  flags            JSONB DEFAULT '{}',
  -- OpenAI moderation categories: {"harassment": true, "violence": false, ...}
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at. Sentiment logs are immutable.
  -- Retained for 12 months maximum, then auto-purged.
);

COMMENT ON TABLE public.sentiment_logs IS 'Private tone monitoring. Never exposed to the other party. Purge after 12 months.';

-- ============================================================
-- UPDATED_AT TRIGGER (applied to all tables with updated_at)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_responses_updated_at
  BEFORE UPDATE ON responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exports_updated_at
  BEFORE UPDATE ON exports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    preferred_language,
    children_count,
    privacy_consent,
    privacy_consent_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
    (NEW.raw_user_meta_data->>'children_count')::INTEGER,
    COALESCE((NEW.raw_user_meta_data->>'privacy_consent')::BOOLEAN, FALSE),
    CASE
      WHEN (NEW.raw_user_meta_data->>'privacy_consent')::BOOLEAN = TRUE THEN NOW()
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================

-- Cases
CREATE INDEX idx_cases_initiator_id ON cases(initiator_id);
CREATE INDEX idx_cases_responder_id ON cases(responder_id) WHERE responder_id IS NOT NULL;
CREATE INDEX idx_cases_status ON cases(status);

-- Invitations
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_case_id ON invitations(case_id);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at) WHERE status = 'sent';
-- Used by cron job to find pending invitations efficiently

-- Questions
CREATE INDEX idx_questions_dispute_type_order ON questions(dispute_type, display_order);
CREATE INDEX idx_questions_active ON questions(is_active) WHERE is_active = TRUE;

-- Responses
CREATE INDEX idx_responses_case_id ON responses(case_id);
CREATE INDEX idx_responses_user_id ON responses(user_id);
CREATE INDEX idx_responses_case_user ON responses(case_id, user_id);
CREATE INDEX idx_responses_submitted ON responses(submitted_at) WHERE submitted_at IS NOT NULL;

-- Timeline
CREATE INDEX idx_timeline_case_id ON case_timeline(case_id);
CREATE INDEX idx_timeline_created_at ON case_timeline(created_at);

-- Documents
CREATE INDEX idx_documents_case_id ON documents(case_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);

-- Exports
CREATE INDEX idx_exports_case_id ON exports(case_id);
CREATE INDEX idx_exports_user_id ON exports(user_id);

-- Sentiment logs
CREATE INDEX idx_sentiment_case_user ON sentiment_logs(case_id, user_id);
CREATE INDEX idx_sentiment_created_at ON sentiment_logs(created_at);
-- Used by the 12-month purge job

-- ============================================================
-- STORAGE BUCKETS (run these in Supabase dashboard or via API)
-- ============================================================
-- Bucket 1: case-documents (private, max file size 10MB)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('case-documents', 'case-documents', FALSE, 10485760,
--   ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword',
--         'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

-- Bucket 2: case-exports (private, no size limit on exports)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('case-exports', 'case-exports', FALSE);
