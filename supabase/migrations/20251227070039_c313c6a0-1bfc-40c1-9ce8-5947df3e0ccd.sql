-- Add new columns to locations table
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS max_depth numeric,
ADD COLUMN IF NOT EXISTS comments text;