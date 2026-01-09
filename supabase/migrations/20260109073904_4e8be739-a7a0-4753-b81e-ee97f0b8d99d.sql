-- Avoid referencing auth.users in RLS (can cause permission errors)
-- Use the email from the JWT instead.

ALTER POLICY "Users can view their own directory record"
ON public.club_members_directory
USING (lower(email) = lower((auth.jwt() ->> 'email')));

ALTER POLICY "Users can update their own contact info"
ON public.club_members_directory
USING (lower(email) = lower((auth.jwt() ->> 'email')))
WITH CHECK (lower(email) = lower((auth.jwt() ->> 'email')));