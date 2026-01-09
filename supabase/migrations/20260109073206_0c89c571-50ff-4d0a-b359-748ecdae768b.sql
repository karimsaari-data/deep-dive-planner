-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage club members directory" ON public.club_members_directory;
DROP POLICY IF EXISTS "Users can view their own directory record" ON public.club_members_directory;
DROP POLICY IF EXISTS "Users can update their own contact info" ON public.club_members_directory;

-- Recreate as PERMISSIVE policies (default behavior)
CREATE POLICY "Admins can manage club members directory" 
ON public.club_members_directory 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own directory record" 
ON public.club_members_directory 
FOR SELECT 
TO authenticated
USING (LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "Users can update their own contact info" 
ON public.club_members_directory 
FOR UPDATE 
TO authenticated
USING (LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid())));