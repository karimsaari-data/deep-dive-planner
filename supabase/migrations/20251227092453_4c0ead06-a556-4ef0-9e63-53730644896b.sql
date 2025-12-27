-- Add member_code column to profiles
ALTER TABLE public.profiles ADD COLUMN member_code TEXT UNIQUE;

-- Create sequence for member codes
CREATE SEQUENCE IF NOT EXISTS public.member_code_seq START 1;

-- Create function to generate member code
CREATE OR REPLACE FUNCTION public.generate_member_code()
RETURNS TRIGGER AS $$
DECLARE
  next_val INTEGER;
BEGIN
  SELECT nextval('public.member_code_seq') INTO next_val;
  NEW.member_code := 'A' || LPAD(next_val::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate member code on insert
CREATE TRIGGER generate_member_code_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.member_code IS NULL)
EXECUTE FUNCTION public.generate_member_code();

-- Update existing profiles with member codes
DO $$
DECLARE
  profile_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR profile_record IN 
    SELECT id FROM public.profiles 
    WHERE member_code IS NULL 
    ORDER BY created_at ASC
  LOOP
    UPDATE public.profiles 
    SET member_code = 'A' || LPAD(counter::TEXT, 4, '0')
    WHERE id = profile_record.id;
    counter := counter + 1;
  END LOOP;
  
  -- Update sequence to continue from the last value
  PERFORM setval('public.member_code_seq', counter);
END $$;