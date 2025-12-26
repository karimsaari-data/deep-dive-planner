-- Add GPS coordinates columns to locations table
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS longitude double precision;