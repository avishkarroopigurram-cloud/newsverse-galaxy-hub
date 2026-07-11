
-- Fix search_path warning on trigger fn
CREATE OR REPLACE FUNCTION public.articles_update_search_vector()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.content,'')), 'C') ||
    setweight(to_tsvector('english', array_to_string(coalesce(NEW.keywords, '{}'), ' ')), 'B');
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

-- Auto-grant admin role to the founder's email on signup
CREATE OR REPLACE FUNCTION public.bootstrap_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'rajanikanth9m@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS bootstrap_admin_role_trg ON auth.users;
CREATE TRIGGER bootstrap_admin_role_trg
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_admin_role();

-- Also handle case where user already exists (retro-grant)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'rajanikanth9m@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
