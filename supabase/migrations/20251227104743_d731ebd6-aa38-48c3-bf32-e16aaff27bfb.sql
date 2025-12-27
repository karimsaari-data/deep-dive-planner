
-- Add is_deleted column to outings table for soft delete
ALTER TABLE public.outings 
ADD COLUMN is_deleted boolean NOT NULL DEFAULT false;

-- Create index for faster queries on non-deleted outings
CREATE INDEX idx_outings_is_deleted ON public.outings(is_deleted) WHERE is_deleted = false;
