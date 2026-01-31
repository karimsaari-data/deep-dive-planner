-- Add dive_zone to waypoint_type enum
ALTER TYPE public.waypoint_type ADD VALUE IF NOT EXISTS 'dive_zone';

-- Add columns for POSS PDF cartography images
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS satellite_map_url TEXT,
ADD COLUMN IF NOT EXISTS bathymetric_map_url TEXT;