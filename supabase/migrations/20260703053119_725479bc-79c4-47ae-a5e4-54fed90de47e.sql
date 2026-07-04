
-- 1. Profiles: add flags
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false;

-- Allow admins to view/update all profiles
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. upload_submissions
CREATE TYPE public.submission_kind AS ENUM ('note', 'paper');
CREATE TYPE public.submission_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.upload_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id uuid NOT NULL,
  kind public.submission_kind NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  pdf_url text NOT NULL,
  -- for notes
  note_category public.note_category,
  -- for papers
  exam_type public.exam_type,
  year integer,
  status public.submission_status NOT NULL DEFAULT 'pending',
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.upload_submissions TO authenticated;
GRANT ALL ON public.upload_submissions TO service_role;

ALTER TABLE public.upload_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own submissions" ON public.upload_submissions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitter_id);

CREATE POLICY "Users view own submissions" ON public.upload_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = submitter_id);

CREATE POLICY "Admins manage all submissions" ON public.upload_submissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. support_tickets
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved');

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'open',
  admin_response text,
  responded_by uuid,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own tickets" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all tickets" ON public.support_tickets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
  LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER support_tickets_touch BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
