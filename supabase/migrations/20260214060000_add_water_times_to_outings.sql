-- Add water entry and exit times to outings table
ALTER TABLE public.outings
  ADD COLUMN water_entry_time TIME,
  ADD COLUMN water_exit_time TIME;

COMMENT ON COLUMN public.outings.water_entry_time IS 'Heure de mise à l''eau prévue';
COMMENT ON COLUMN public.outings.water_exit_time IS 'Heure de sortie de l''eau prévue';
