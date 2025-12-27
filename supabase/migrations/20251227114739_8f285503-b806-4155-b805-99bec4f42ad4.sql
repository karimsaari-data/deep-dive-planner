-- Add photo_url and unique_code columns to equipment_inventory
ALTER TABLE public.equipment_inventory 
ADD COLUMN photo_url TEXT,
ADD COLUMN unique_code TEXT;

-- Generate unique codes for existing items
UPDATE public.equipment_inventory 
SET unique_code = 'EQ-' || UPPER(SUBSTRING(id::text, 1, 8))
WHERE unique_code IS NULL;

-- Make unique_code not null and unique
ALTER TABLE public.equipment_inventory 
ALTER COLUMN unique_code SET NOT NULL,
ADD CONSTRAINT equipment_inventory_unique_code_unique UNIQUE (unique_code);

-- Create function to generate unique equipment code
CREATE OR REPLACE FUNCTION public.generate_equipment_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.unique_code := 'EQ-' || UPPER(SUBSTRING(NEW.id::text, 1, 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate unique code
CREATE TRIGGER generate_equipment_code_trigger
BEFORE INSERT ON public.equipment_inventory
FOR EACH ROW
EXECUTE FUNCTION public.generate_equipment_code();