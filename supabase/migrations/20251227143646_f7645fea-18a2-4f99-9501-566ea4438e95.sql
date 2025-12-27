-- Create a function to get the confirmed count for an outing (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_outing_confirmed_count(outing_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.reservations
  WHERE outing_id = outing_uuid
    AND status = 'confirmé'
$$;