-- Add new columns to club_members_directory
ALTER TABLE public.club_members_directory 
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT;

-- Migrate existing data from emergency_contact if it exists
UPDATE public.club_members_directory 
SET emergency_contact_name = emergency_contact
WHERE emergency_contact IS NOT NULL 
  AND emergency_contact_name IS NULL;

-- Drop the old column
ALTER TABLE public.club_members_directory DROP COLUMN IF EXISTS emergency_contact;