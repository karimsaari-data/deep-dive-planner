-- Add is_archived column to outings table
ALTER TABLE public.outings
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;