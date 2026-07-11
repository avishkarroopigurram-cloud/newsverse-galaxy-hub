
-- === Extensions ===
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- === Roles enum + user_roles ===
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- Admins can manage roles
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- === Articles ===
CREATE TABLE IF NOT EXISTS public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  content text,
  url text,
  image_url text,
  source_id text,
  source_name text,
  author text,
  category text NOT NULL,
  country text,
  language text,
  keywords text[] DEFAULT '{}',
  published_at timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  ai_summary text,
  ai_takeaways text[] DEFAULT '{}',
  ai_meta_description text,
  ai_categorized_as text,
  reading_time_minutes int DEFAULT 3,
  status text NOT NULL DEFAULT 'approved',  -- approved|pending|rejected
  is_featured boolean NOT NULL DEFAULT false,
  is_breaking boolean NOT NULL DEFAULT false,
  is_editors_pick boolean NOT NULL DEFAULT false,
  view_count int NOT NULL DEFAULT 0,
  search_vector tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read approved articles" ON public.articles;
CREATE POLICY "Public read approved articles" ON public.articles
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

DROP POLICY IF EXISTS "Admins read all articles" ON public.articles;
CREATE POLICY "Admins read all articles" ON public.articles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "Admins write articles" ON public.articles;
CREATE POLICY "Admins write articles" ON public.articles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE INDEX IF NOT EXISTS articles_published_idx ON public.articles (published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS articles_category_idx ON public.articles (category, published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS articles_breaking_idx ON public.articles (is_breaking, published_at DESC NULLS LAST) WHERE is_breaking = true;
CREATE INDEX IF NOT EXISTS articles_featured_idx ON public.articles (is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS articles_keywords_gin ON public.articles USING gin (keywords);
CREATE INDEX IF NOT EXISTS articles_search_gin ON public.articles USING gin (search_vector);

-- search_vector maintenance
CREATE OR REPLACE FUNCTION public.articles_update_search_vector()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.content,'')), 'C') ||
    setweight(to_tsvector('english', array_to_string(coalesce(NEW.keywords, '{}'), ' ')), 'B');
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS articles_search_vector_trg ON public.articles;
CREATE TRIGGER articles_search_vector_trg
  BEFORE INSERT OR UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.articles_update_search_vector();

-- === Fetch log ===
CREATE TABLE IF NOT EXISTS public.article_fetch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  category text,
  inserted_count int NOT NULL DEFAULT 0,
  duplicate_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',  -- success|error|rate_limited
  error text,
  rate_limited boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.article_fetch_log TO authenticated;
GRANT ALL ON public.article_fetch_log TO service_role;
ALTER TABLE public.article_fetch_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read fetch log" ON public.article_fetch_log;
CREATE POLICY "Admins read fetch log" ON public.article_fetch_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE INDEX IF NOT EXISTS fetch_log_ran_idx ON public.article_fetch_log (ran_at DESC);
