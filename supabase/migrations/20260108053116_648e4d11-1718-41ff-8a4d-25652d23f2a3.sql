-- Add policy allowing users to view their own record in club_members_directory
CREATE POLICY "Users can view their own directory record"
ON public.club_members_directory
FOR SELECT
USING (LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid())));

-- Add policy allowing users to update their own contact info in club_members_directory
CREATE POLICY "Users can update their own contact info"
ON public.club_members_directory
FOR UPDATE
USING (LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid())))