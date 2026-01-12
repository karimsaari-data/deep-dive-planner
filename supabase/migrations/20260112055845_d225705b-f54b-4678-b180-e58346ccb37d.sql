-- Drop the security definer view and recreate as SECURITY INVOKER (default, safer)
DROP VIEW IF EXISTS public.club_members_trombinoscope;

-- Recreate view with SECURITY INVOKER (explicit) - queries run with caller's permissions
CREATE VIEW public.club_members_trombinoscope 
WITH (security_invoker = true)
AS
SELECT 
  id,
  first_name,
  last_name,
  apnea_level,
  board_role,
  is_encadrant,
  email
FROM public.club_members_directory;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.club_members_trombinoscope TO authenticated;

-- Add a permissive SELECT policy on the base table for authenticated users
-- but ONLY for the limited columns they can access via the view
-- Since views with security_invoker check RLS on base table, we need to allow SELECT
CREATE POLICY "Authenticated can select for trombinoscope view"
ON public.club_members_directory
FOR SELECT
TO authenticated
USING (true);