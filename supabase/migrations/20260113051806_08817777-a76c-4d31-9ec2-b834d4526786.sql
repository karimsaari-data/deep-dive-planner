-- Create a security definer function to check if current user is encadrant
CREATE OR REPLACE FUNCTION public.is_current_user_encadrant()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_encadrant 
     FROM public.club_members_directory 
     WHERE lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
     LIMIT 1),
    false
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_current_user_encadrant() TO authenticated;