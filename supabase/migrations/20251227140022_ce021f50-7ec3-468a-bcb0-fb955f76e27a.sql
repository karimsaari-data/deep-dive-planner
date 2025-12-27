-- Allow authenticated users to see profiles of participants in the same outings
CREATE POLICY "Members can view participant profiles in outings" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.reservations r1
    JOIN public.reservations r2 ON r1.outing_id = r2.outing_id
    WHERE r1.user_id = auth.uid() 
    AND r2.user_id = profiles.id
    AND r1.status != 'annulé'
    AND r2.status != 'annulé'
  )
);