-- Add provider tracking column
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'newsdata';
CREATE INDEX IF NOT EXISTS idx_articles_provider ON public.articles(provider);

-- Add provider column to fetch log
ALTER TABLE public.article_fetch_log ADD COLUMN IF NOT EXISTS provider TEXT;

-- Update bootstrap function to include the second admin email
CREATE OR REPLACE FUNCTION public.bootstrap_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IN ('rajanikanth9m@gmail.com', 'avishkargurram@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Backfill: if avishkargurram@gmail.com already exists in auth.users, grant admin now
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'avishkargurram@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;