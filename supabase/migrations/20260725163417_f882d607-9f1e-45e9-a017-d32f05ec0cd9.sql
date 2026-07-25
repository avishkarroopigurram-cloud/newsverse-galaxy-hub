-- Add second admin email + include in bootstrap trigger. Also backfill roles.
CREATE OR REPLACE FUNCTION public.bootstrap_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IN ('rajanikanth9m@gmail.com', 'avishkargurram@gmail.com', 'aavishkarroopi@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Backfill: if these users already exist in auth.users, ensure they have admin role.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE email IN ('rajanikanth9m@gmail.com', 'avishkargurram@gmail.com', 'aavishkarroopi@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;