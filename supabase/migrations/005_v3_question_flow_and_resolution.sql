-- ============================================================
-- FairSettle v3 — Versioned question flow, family profile data,
-- and durable comparison / negotiation state.
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parent_role TEXT CHECK (parent_role IN ('mum', 'dad'));

-- ------------------------------------------------------------
-- CASES
-- ------------------------------------------------------------
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS question_set_version TEXT,
  ADD COLUMN IF NOT EXISTS completed_phases TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS initiator_satisfied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responder_satisfied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_generate_due_at TIMESTAMPTZ;

UPDATE public.cases
SET question_set_version = 'v1'
WHERE question_set_version IS NULL;

ALTER TABLE public.cases
  ALTER COLUMN question_set_version SET DEFAULT 'v2',
  ALTER COLUMN question_set_version SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cases_question_set_version_check'
  ) THEN
    ALTER TABLE public.cases
      ADD CONSTRAINT cases_question_set_version_check
      CHECK (question_set_version IN ('v1', 'v2'));
  END IF;
END $$;

-- ------------------------------------------------------------
-- CHILDREN
-- Profile-scoped rows are the editable source of truth for future
-- cases. Case-scoped rows are immutable snapshots for a live case.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.children (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id              UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id                 UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  source_profile_child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  first_name              TEXT,
  date_of_birth           DATE NOT NULL,
  sort_order              INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT children_single_scope CHECK (
    ((profile_id IS NOT NULL)::INT + (case_id IS NOT NULL)::INT) = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_children_owner_user_id ON public.children(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_children_profile_id ON public.children(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_children_case_id ON public.children(case_id) WHERE case_id IS NOT NULL;

CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "children_select_owned_or_case_participant" ON public.children;
CREATE POLICY "children_select_owned_or_case_participant"
  ON public.children
  FOR SELECT
  USING (
    auth.uid() = owner_user_id
    OR (
      case_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.cases
        WHERE cases.id = children.case_id
          AND (cases.initiator_id = auth.uid() OR cases.responder_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "children_insert_own_profile_rows" ON public.children;
CREATE POLICY "children_insert_own_profile_rows"
  ON public.children
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_user_id
    AND profile_id = auth.uid()
    AND case_id IS NULL
  );

DROP POLICY IF EXISTS "children_update_own_profile_rows" ON public.children;
CREATE POLICY "children_update_own_profile_rows"
  ON public.children
  FOR UPDATE
  USING (auth.uid() = owner_user_id AND profile_id = auth.uid() AND case_id IS NULL)
  WITH CHECK (auth.uid() = owner_user_id AND profile_id = auth.uid() AND case_id IS NULL);

DROP POLICY IF EXISTS "children_delete_own_profile_rows" ON public.children;
CREATE POLICY "children_delete_own_profile_rows"
  ON public.children
  FOR DELETE
  USING (auth.uid() = owner_user_id AND profile_id = auth.uid() AND case_id IS NULL);

-- ------------------------------------------------------------
-- QUESTIONS
-- Add versioning and adaptive-question metadata
-- ------------------------------------------------------------
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS question_set_version TEXT,
  ADD COLUMN IF NOT EXISTS min_child_age INTEGER CHECK (min_child_age IS NULL OR min_child_age >= 0),
  ADD COLUMN IF NOT EXISTS max_child_age INTEGER CHECK (max_child_age IS NULL OR max_child_age >= 0),
  ADD COLUMN IF NOT EXISTS skip_if_combined BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_per_child BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.questions
SET question_set_version = 'v1'
WHERE question_set_version IS NULL;

ALTER TABLE public.questions
  ALTER COLUMN question_set_version SET DEFAULT 'v1',
  ALTER COLUMN question_set_version SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'questions_unique_order'
  ) THEN
    ALTER TABLE public.questions DROP CONSTRAINT questions_unique_order;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'questions_unique_version_order'
  ) THEN
    ALTER TABLE public.questions
      ADD CONSTRAINT questions_unique_version_order
      UNIQUE (question_set_version, dispute_type, display_order);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'questions_question_set_version_check'
  ) THEN
    ALTER TABLE public.questions
      ADD CONSTRAINT questions_question_set_version_check
      CHECK (question_set_version IN ('v1', 'v2'));
  END IF;
END $$;

DROP INDEX IF EXISTS idx_questions_dispute_type_order;
CREATE INDEX IF NOT EXISTS idx_questions_version_type_order
  ON public.questions(question_set_version, dispute_type, display_order);

-- Duplicate the current bank into v2, then apply v3-specific changes.
INSERT INTO public.questions (
  question_set_version,
  dispute_type,
  section,
  question_text,
  question_type,
  options,
  display_order,
  guidance_text,
  is_active,
  min_child_age,
  max_child_age,
  skip_if_combined,
  is_per_child,
  created_at,
  updated_at
)
SELECT
  'v2',
  dispute_type,
  section,
  question_text,
  question_type,
  options,
  display_order,
  guidance_text,
  is_active,
  min_child_age,
  max_child_age,
  skip_if_combined,
  is_per_child,
  NOW(),
  NOW()
FROM public.questions
WHERE question_set_version = 'v1'
  AND NOT EXISTS (
    SELECT 1
    FROM public.questions q2
    WHERE q2.question_set_version = 'v2'
      AND q2.dispute_type = questions.dispute_type
      AND q2.display_order = questions.display_order
  );

UPDATE public.questions
SET question_text = '{"en": "What town or city do you live in?"}',
    guidance_text = NULL
WHERE question_set_version = 'v2'
  AND dispute_type = 'child'
  AND display_order = 2;

UPDATE public.questions
SET question_text = '{"en": "What is your postcode?"}',
    guidance_text = NULL
WHERE question_set_version = 'v2'
  AND dispute_type = 'child'
  AND display_order = 3;

UPDATE public.questions
SET question_text = '{"en": "For this child, which best describes their current education or childcare setting?"}',
    options = '{"en": ["Nursery or childcare", "Primary or secondary school", "College, sixth form or training", "Home educated", "Not currently in education"]}',
    min_child_age = 3,
    is_per_child = TRUE
WHERE question_set_version = 'v2'
  AND dispute_type = 'child'
  AND display_order = 5;

UPDATE public.questions
SET question_text = '{"en": "For this child, which parent lives closer to their school or childcare setting?"}',
    options = '{"en": ["Me", "The other parent", "About the same distance", "Not applicable"]}',
    min_child_age = 5,
    max_child_age = 16,
    is_per_child = TRUE
WHERE question_set_version = 'v2'
  AND dispute_type = 'child'
  AND display_order = 6;

UPDATE public.questions
SET max_child_age = 13
WHERE question_set_version = 'v2'
  AND dispute_type = 'child'
  AND display_order = 13;

UPDATE public.questions
SET max_child_age = 15
WHERE question_set_version = 'v2'
  AND dispute_type = 'child'
  AND display_order = 14;

UPDATE public.questions
SET max_child_age = 11
WHERE question_set_version = 'v2'
  AND dispute_type = 'child'
  AND display_order = 20;

UPDATE public.questions
SET skip_if_combined = TRUE
WHERE question_set_version = 'v2'
  AND (
    (dispute_type = 'financial' AND display_order BETWEEN 6 AND 9)
    OR (dispute_type = 'financial' AND display_order BETWEEN 13 AND 14)
  );

UPDATE public.questions
SET guidance_text = '{"en": "Select all that apply. Only choose options that genuinely belong to this pension."}'
WHERE question_set_version = 'v2'
  AND dispute_type = 'financial'
  AND display_order = 14;

-- ------------------------------------------------------------
-- RESPONSES
-- Add child-aware answers. Preserve v1 rows.
-- ------------------------------------------------------------
ALTER TABLE public.responses
  ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES public.children(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'responses_unique_per_user_per_question'
  ) THEN
    ALTER TABLE public.responses DROP CONSTRAINT responses_unique_per_user_per_question;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_responses_unique_unscoped
  ON public.responses(case_id, user_id, question_id)
  WHERE child_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_responses_unique_child_scoped
  ON public.responses(case_id, user_id, question_id, child_id)
  WHERE child_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_responses_child_id ON public.responses(child_id) WHERE child_id IS NOT NULL;

-- ------------------------------------------------------------
-- DURABLE NEGOTIATION STATE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.case_item_states (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id            UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  item_key           TEXT NOT NULL,
  question_id        UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  child_id           UUID REFERENCES public.children(id) ON DELETE CASCADE,
  review_bucket      TEXT NOT NULL DEFAULT 'to_review'
                     CHECK (review_bucket IN ('to_review', 'agreed', 'disputed', 'locked', 'unresolved')),
  round_count        INTEGER NOT NULL DEFAULT 0 CHECK (round_count >= 0 AND round_count <= 3),
  initiator_status   TEXT NOT NULL DEFAULT 'pending'
                     CHECK (initiator_status IN ('pending', 'accepted', 'modified', 'rejected')),
  responder_status   TEXT NOT NULL DEFAULT 'pending'
                     CHECK (responder_status IN ('pending', 'accepted', 'modified', 'rejected')),
  initiator_value    JSONB,
  responder_value    JSONB,
  locked_at          TIMESTAMPTZ,
  unresolved_at      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT case_item_states_unique_item UNIQUE (case_id, item_key)
);

CREATE TABLE IF NOT EXISTS public.case_item_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  item_key        TEXT NOT NULL,
  question_id     UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  child_id        UUID REFERENCES public.children(id) ON DELETE CASCADE,
  actor_user_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action          TEXT NOT NULL CHECK (action IN ('accept', 'modify', 'reject', 'lock', 'unresolved', 'comparison_unlocked')),
  proposed_value  JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_item_states_case ON public.case_item_states(case_id);
CREATE INDEX IF NOT EXISTS idx_case_item_events_case ON public.case_item_events(case_id);
CREATE INDEX IF NOT EXISTS idx_case_item_events_item ON public.case_item_events(case_id, item_key, created_at DESC);

CREATE TRIGGER update_case_item_states_updated_at
  BEFORE UPDATE ON public.case_item_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.case_item_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_item_states FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_item_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_item_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "case_item_states_case_parties_select" ON public.case_item_states;
CREATE POLICY "case_item_states_case_parties_select"
  ON public.case_item_states
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.cases
      WHERE cases.id = case_item_states.case_id
        AND (cases.initiator_id = auth.uid() OR cases.responder_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "case_item_events_case_parties_select" ON public.case_item_events;
CREATE POLICY "case_item_events_case_parties_select"
  ON public.case_item_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.cases
      WHERE cases.id = case_item_events.case_id
        AND (cases.initiator_id = auth.uid() OR cases.responder_id = auth.uid())
    )
  );

-- ------------------------------------------------------------
-- UPGRADE signup trigger for parent_role + children metadata
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  child_record JSONB;
  child_index INTEGER := 0;
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    preferred_language,
    children_count,
    parent_role,
    privacy_consent,
    privacy_consent_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
    COALESCE((NEW.raw_user_meta_data->>'children_count')::INTEGER, 0),
    CASE
      WHEN NEW.raw_user_meta_data ? 'parent_role' THEN NEW.raw_user_meta_data->>'parent_role'
      ELSE NULL
    END,
    COALESCE((NEW.raw_user_meta_data->>'privacy_consent')::BOOLEAN, FALSE),
    CASE
      WHEN (NEW.raw_user_meta_data->>'privacy_consent')::BOOLEAN = TRUE THEN NOW()
      ELSE NULL
    END
  );

  IF jsonb_typeof(NEW.raw_user_meta_data->'children') = 'array' THEN
    FOR child_record IN
      SELECT value FROM jsonb_array_elements(NEW.raw_user_meta_data->'children')
    LOOP
      IF child_record ? 'date_of_birth' THEN
        INSERT INTO public.children (
          owner_user_id,
          profile_id,
          first_name,
          date_of_birth,
          sort_order
        )
        VALUES (
          NEW.id,
          NEW.id,
          NULLIF(child_record->>'first_name', ''),
          (child_record->>'date_of_birth')::DATE,
          child_index
        );
      END IF;

      child_index := child_index + 1;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
