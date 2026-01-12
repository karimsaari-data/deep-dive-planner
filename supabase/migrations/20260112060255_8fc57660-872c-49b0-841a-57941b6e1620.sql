-- Drop and recreate the function with avatar_url included
DROP FUNCTION IF EXISTS public.get_trombinoscope_members();

CREATE FUNCTION public.get_trombinoscope_members()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  apnea_level text,
  board_role text,
  is_encadrant boolean,
  email text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cmd.id,
    cmd.first_name,
    cmd.last_name,
    cmd.apnea_level,
    cmd.board_role,
    cmd.is_encadrant,
    cmd.email,
    p.avatar_url
  FROM public.club_members_directory cmd
  LEFT JOIN public.profiles p ON lower(cmd.email) = lower(p.email)
  ORDER BY cmd.last_name ASC;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_trombinoscope_members() TO authenticated;