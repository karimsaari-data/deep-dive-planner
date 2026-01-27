-- Add RLS policy for carpool participants to view driver profiles
CREATE POLICY "Carpool participants can view driver profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM carpools c
    JOIN reservations r ON r.outing_id = c.outing_id
    WHERE c.driver_id = profiles.id
      AND r.user_id = auth.uid()
      AND r.status <> 'annulé'
  )
);