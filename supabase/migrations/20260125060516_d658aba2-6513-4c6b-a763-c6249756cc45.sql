-- Add phone column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone text;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.phone IS 'User phone number for carpool contact';