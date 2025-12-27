-- Add DELETE policy for profiles (admin only)
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for reservations (admin only)
CREATE POLICY "Admins can delete reservations"
  ON public.reservations FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));