
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'student');
CREATE TYPE public.branch_code AS ENUM ('CSE','CSM','CSD','CS','CIVIL','ECE');
CREATE TYPE public.exam_type AS ENUM ('mid1','mid2','sem');
CREATE TYPE public.note_category AS ENUM ('unit','assignment','lab','important');
CREATE TYPE public.resource_kind AS ENUM ('paper','note');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by owner" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles updatable by owner" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles insertable by owner" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Subjects
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  branch branch_code NOT NULL,
  semester SMALLINT NOT NULL CHECK (semester BETWEEN 1 AND 6),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subjects TO anon, authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subjects readable by everyone" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Admins manage subjects" ON public.subjects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Previous papers
CREATE TABLE public.previous_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  exam_type exam_type NOT NULL,
  title TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.previous_papers TO anon, authenticated;
GRANT ALL ON public.previous_papers TO service_role;
ALTER TABLE public.previous_papers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Papers readable by everyone" ON public.previous_papers FOR SELECT USING (true);
CREATE POLICY "Admins manage papers" ON public.previous_papers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Notes
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category note_category NOT NULL,
  pdf_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notes TO anon, authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notes readable by everyone" ON public.notes FOR SELECT USING (true);
CREATE POLICY "Admins manage notes" ON public.notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Bookmarks
CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_kind resource_kind NOT NULL,
  resource_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_kind, resource_id)
);
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own bookmarks" ON public.bookmarks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Recently viewed
CREATE TABLE public.recent_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recent_views TO authenticated;
GRANT ALL ON public.recent_views TO service_role;
ALTER TABLE public.recent_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own recent views" ON public.recent_views FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed subjects
INSERT INTO public.subjects (name, code, branch, semester, description) VALUES
('Engineering Mathematics-I','MA101','CSE',1,'Calculus, matrices, differential equations'),
('Basic Electrical Engineering','EE101','CSE',1,'Circuits, network theorems, machines'),
('Engineering Physics','PH101','CSE',1,'Mechanics, optics, modern physics'),
('Programming for Problem Solving','CS101','CSE',1,'C programming fundamentals'),
('Engineering Mathematics-II','MA201','CSE',2,'Vector calculus, transforms'),
('Data Structures','CS201','CSE',2,'Arrays, linked lists, trees, graphs'),
('Digital Logic Design','EC202','CSE',2,'Boolean algebra, sequential circuits'),
('Computer Organization','CS301','CSE',3,'CPU architecture, memory, I/O'),
('Database Management Systems','CS302','CSE',3,'Relational model, SQL, normalization'),
('Operating Systems','CS401','CSE',4,'Processes, scheduling, memory mgmt'),
('Design and Analysis of Algorithms','CS402','CSE',4,'Greedy, DP, graph algorithms'),
('Computer Networks','CS501','CSE',5,'OSI model, TCP/IP, routing'),
('Software Engineering','CS502','CSE',5,'SDLC, agile, testing'),
('Compiler Design','CS601','CSE',6,'Lexical analysis, parsing, code gen'),
('Machine Learning','CSM301','CSM',3,'Supervised, unsupervised learning'),
('Deep Learning','CSM401','CSM',4,'Neural networks, CNN, RNN'),
('AI Fundamentals','CSM201','CSM',2,'Search, knowledge representation'),
('Big Data Analytics','CSD301','CSD',3,'Hadoop, Spark, data pipelines'),
('Data Visualization','CSD401','CSD',4,'Tableau, charts, dashboards'),
('Cyber Security','CS501C','CS',5,'Cryptography, network security'),
('Structural Analysis','CE301','CIVIL',3,'Beams, trusses, frames'),
('Fluid Mechanics','CE201','CIVIL',2,'Fluid statics, dynamics'),
('Surveying','CE101','CIVIL',1,'Levelling, chain, theodolite'),
('Signals and Systems','EC301','ECE',3,'LTI systems, Fourier'),
('Analog Electronics','EC201','ECE',2,'Amplifiers, op-amps'),
('Microprocessors','EC401','ECE',4,'8086, embedded systems');
