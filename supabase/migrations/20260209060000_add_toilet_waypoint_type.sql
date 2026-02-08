-- Add toilet to waypoint_type enum
ALTER TYPE public.waypoint_type ADD VALUE IF NOT EXISTS 'toilet';
