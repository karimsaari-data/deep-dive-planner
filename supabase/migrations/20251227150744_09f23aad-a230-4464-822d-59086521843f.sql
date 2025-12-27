-- Create a security definer function to get outing participants
-- This bypasses RLS to show all confirmed participants to members of the same outing
CREATE OR REPLACE FUNCTION public.get_outing_participants(outing_uuid uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  member_status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.member_status::text
  FROM public.reservations r
  JOIN public.profiles p ON r.user_id = p.id
  WHERE r.outing_id = outing_uuid
    AND r.status = 'confirmé'
  ORDER BY 
    CASE WHEN p.member_status = 'Encadrant' THEN 0 ELSE 1 END,
    p.first_name
$$;