-- Add policy for authenticated users to view all members in directory (for Trombinoscope)
CREATE POLICY "Authenticated users can view directory for trombinoscope"
ON public.club_members_directory
FOR SELECT
TO authenticated
USING (true);