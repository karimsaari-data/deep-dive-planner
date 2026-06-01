-- Comptage fiable de la liste d'attente (bypass RLS), comme get_outing_confirmed_count.
-- Le tableau reservations intégré côté client est filtré par RLS, donc on ne peut
-- pas compter les en_attente des autres membres de façon fiable depuis le front.
CREATE OR REPLACE FUNCTION public.get_outing_waitlist_count(outing_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.reservations
  WHERE outing_id = outing_uuid
    AND status = 'en_attente'
$$;
