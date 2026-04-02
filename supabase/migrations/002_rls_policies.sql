-- ============================================================
-- FairSettle MVP — Migration 002: Row Level Security Policies
-- Run AFTER 001_create_tables.sql
-- RLS is critical: Party A must NEVER see Party B's private data
-- ============================================================

-- Enable RLS on every table
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_timeline  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentiment_logs ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (security hardening)
ALTER TABLE public.profiles       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cases          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invitations    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.questions      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.responses      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_timeline  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.documents      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exports        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sentiment_logs FORCE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES POLICIES
-- Users can only read and update their own profile.
-- ============================================================

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No INSERT policy needed: profiles are created by the handle_new_user() trigger (SECURITY DEFINER)
-- No DELETE policy on profiles: deletion cascades from auth.users deletion

-- ============================================================
-- CASES POLICIES
-- Initiator: full access to their own cases
-- Responder: read-only access to cases where they are the responder
-- Nobody else can access any case data
-- ============================================================

CREATE POLICY "cases_initiator_all"
  ON public.cases
  FOR ALL
  USING (auth.uid() = initiator_id)
  WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "cases_responder_select"
  ON public.cases
  FOR SELECT
  USING (auth.uid() = responder_id AND responder_id IS NOT NULL);

-- Responder can update only specific columns (handled at application level via API route)
-- RLS allows the update; application layer restricts which columns change

-- ============================================================
-- INVITATIONS POLICIES
-- Only the initiator (case owner) can see and manage invitations.
-- The token validation route uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
-- ============================================================

CREATE POLICY "invitations_case_owner_all"
  ON public.invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = invitations.case_id
        AND cases.initiator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = invitations.case_id
        AND cases.initiator_id = auth.uid()
    )
  );

-- ============================================================
-- QUESTIONS POLICIES
-- Questions are not sensitive. Anyone (including unauthenticated users) can read them.
-- This supports the invitation landing page showing question previews.
-- No INSERT/UPDATE/DELETE for regular users — questions are seeded only.
-- ============================================================

CREATE POLICY "questions_public_select"
  ON public.questions
  FOR SELECT
  USING (is_active = TRUE);

-- ============================================================
-- RESPONSES POLICIES
-- CRITICAL: Each user can only read and write their OWN responses.
-- Party A cannot see Party B's responses through any client-side query.
-- The comparison view is generated ONLY by server-side code using SUPABASE_SERVICE_ROLE_KEY.
-- ============================================================

CREATE POLICY "responses_own_select"
  ON public.responses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "responses_own_insert"
  ON public.responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "responses_own_update"
  ON public.responses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE on responses: responses are permanent once submitted (version history kept)

-- ============================================================
-- CASE_TIMELINE POLICIES
-- Both initiator and responder can read their case's timeline.
-- Timeline rows are inserted only by server-side code (service role), never directly by client.
-- ============================================================

CREATE POLICY "timeline_case_parties_select"
  ON public.case_timeline
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = case_timeline.case_id
        AND (
          cases.initiator_id = auth.uid()
          OR cases.responder_id = auth.uid()
        )
    )
  );

-- No INSERT/UPDATE/DELETE for regular users: timeline is written by server-side code only
-- (service role key bypasses RLS for timeline inserts in API routes)

-- ============================================================
-- DOCUMENTS POLICIES
-- Users can only access documents they uploaded.
-- The case export (PDF generation) is server-side and uses service role key.
-- ============================================================

CREATE POLICY "documents_own_select"
  ON public.documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "documents_own_insert"
  ON public.documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "documents_own_delete"
  ON public.documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- EXPORTS POLICIES
-- Users can only access exports they paid for.
-- ============================================================

CREATE POLICY "exports_own_select"
  ON public.exports
  FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT for regular users: exports are created by the Stripe webhook server-side

-- ============================================================
-- SENTIMENT_LOGS POLICIES
-- Users can only see their own sentiment logs.
-- These logs are never exposed to the other party under any circumstances.
-- ============================================================

CREATE POLICY "sentiment_own_select"
  ON public.sentiment_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "sentiment_own_insert"
  ON public.sentiment_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORAGE POLICIES
-- Supabase Storage bucket access is controlled separately via storage.policies.
-- Apply these in the Supabase dashboard or via the Management API.
-- ============================================================

-- Bucket: case-documents
-- Policy: Users can upload to their own folder
-- INSERT: (bucket_id = 'case-documents') AND (auth.uid()::text = (storage.foldername(name))[2])
--         Path format: cases/{case_id}/{user_id}/{filename}
--         (storage.foldername(name))[2] extracts the user_id segment

-- Policy: Users can read their own documents
-- SELECT: (bucket_id = 'case-documents') AND (auth.uid()::text = (storage.foldername(name))[2])

-- Policy: Users can delete their own documents
-- DELETE: (bucket_id = 'case-documents') AND (auth.uid()::text = (storage.foldername(name))[2])

-- Bucket: case-exports
-- Policy: Users can read their own exports (matched by folder structure)
-- SELECT: (bucket_id = 'case-exports') AND (auth.uid()::text = ... )
-- No upload from client. Exports are written server-side via service role.

-- ============================================================
-- VERIFICATION QUERIES
-- Run these after applying policies to confirm RLS is working.
-- Expected: Each query returns only data for the specified user.
-- ============================================================

-- Test 1: Confirm profiles RLS (should return 1 row — own profile only)
-- SELECT count(*) FROM profiles;  -- When run as user X, returns 1

-- Test 2: Confirm responses RLS (should return 0 rows for Party B's responses)
-- SELECT count(*) FROM responses WHERE user_id != auth.uid();  -- Should be 0

-- Test 3: Confirm cases RLS (should not see cases where user is neither initiator nor responder)
-- SELECT count(*) FROM cases WHERE initiator_id != auth.uid() AND responder_id != auth.uid();  -- Should be 0
