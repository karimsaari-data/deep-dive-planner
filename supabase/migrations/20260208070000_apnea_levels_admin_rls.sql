-- Allow admins to manage apnea_levels
CREATE POLICY "Admins can manage apnea_levels"
  ON public.apnea_levels FOR ALL
  USING (has_role(auth.uid(), 'admin'));
