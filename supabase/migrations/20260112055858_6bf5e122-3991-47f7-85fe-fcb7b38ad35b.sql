-- Clean up: drop the view and the too-permissive policy
DROP VIEW IF EXISTS public.club_members_trombinoscope;
DROP POLICY IF EXISTS "Authenticated can select for trombinoscope view" ON public.club_members_directory;
DROP POLICY IF EXISTS "Admins can view all directory records" ON public.club_members_directory;

-- Create a SECURITY DEFINER function to safely return only trombinoscope data
-- This function runs with elevated privileges but only returns non-sensitive fields
CREATE OR REPLACE FUNCTION public.get_trombinoscope_members()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  apnea_level text,
  board_role text,
  is_encadrant boolean,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    first_name,
    last_name,
    apnea_level,
    board_role,
    is_encadrant,
    email
  FROM public.club_members_directory
  ORDER BY last_name ASC;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_trombinoscope_members() TO authenticated;