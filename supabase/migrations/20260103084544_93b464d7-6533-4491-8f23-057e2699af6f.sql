-- Add estimated_value column to equipment_catalog table
ALTER TABLE public.equipment_catalog
ADD COLUMN estimated_value numeric DEFAULT 0;