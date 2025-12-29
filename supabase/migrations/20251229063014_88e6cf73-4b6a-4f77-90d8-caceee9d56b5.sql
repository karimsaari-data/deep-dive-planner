-- Add staff-only column to outings table
ALTER TABLE public.outings ADD COLUMN is_staff_only boolean NOT NULL DEFAULT false;

-- Create a function to check if user is staff (encadrant or admin)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id AND member_status = 'Encadrant'
  )
  OR public.has_role(_user_id, 'admin')
  OR public.has_role(_user_id, 'organizer')
$$;

-- Update RLS policy for viewing outings - restrict staff-only outings
DROP POLICY IF EXISTS "Anyone can view outings" ON public.outings;

CREATE POLICY "Anyone can view public outings"
ON public.outings
FOR SELECT
USING (
  (is_staff_only = false) 
  OR 
  (is_staff_only = true AND public.is_staff(auth.uid()))
);

-- Update RLS policy for reservations - prevent non-staff from registering to staff-only outings
CREATE POLICY "Prevent non-staff registration to staff outings"
ON public.reservations
FOR INSERT
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.outings 
    WHERE id = outing_id 
    AND is_staff_only = true 
    AND NOT public.is_staff(auth.uid())
  )
);