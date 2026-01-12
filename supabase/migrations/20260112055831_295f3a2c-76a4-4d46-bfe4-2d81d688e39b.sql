-- Drop the overly permissive policy that exposes all data
DROP POLICY IF EXISTS "Authenticated users can view directory for trombinoscope" ON public.club_members_directory;

-- Create a secure view for trombinoscope that only exposes non-sensitive fields
CREATE OR REPLACE VIEW public.club_members_trombinoscope AS
SELECT 
  id,
  first_name,
  last_name,
  apnea_level,
  board_role,
  is_encadrant,
  email  -- Only needed for avatar matching, but email is less sensitive than full contact info
FROM public.club_members_directory;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.club_members_trombinoscope TO authenticated;

-- Add a security definer function to safely check if user can access full member data
CREATE OR REPLACE FUNCTION public.can_view_member_details(_member_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(auth.uid(), 'admin') 
    OR lower(_member_email) = lower((auth.jwt() ->> 'email')::text)
$$;

-- Create a new restrictive SELECT policy that only allows:
-- 1. Admins to see everything
-- 2. Users to see their own record
CREATE POLICY "Admins can view all directory records"
ON public.club_members_directory
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Note: The existing "Users can view their own directory record" policy already handles self-access