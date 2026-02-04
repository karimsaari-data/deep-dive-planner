-- 1. Add new columns to membership_yearly_status
ALTER TABLE public.membership_yearly_status
ADD COLUMN IF NOT EXISTS is_encadrant BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS board_role TEXT,
ADD COLUMN IF NOT EXISTS apnea_level TEXT,
ADD COLUMN IF NOT EXISTS license_number TEXT;

-- 2. Migrate current data from club_members_directory to membership_yearly_status for season 2025
-- For members that don't have a 2025 entry yet, create one with their current values
INSERT INTO public.membership_yearly_status (
  member_id,
  season_year,
  payment_status,
  medical_certificate_ok,
  buddies_charter_signed,
  fsgt_insurance_ok,
  is_encadrant,
  board_role,
  apnea_level
)
SELECT 
  cmd.id,
  2025,
  cmd.payment_status,
  cmd.medical_certificate_ok,
  cmd.buddies_charter_signed,
  cmd.fsgt_insurance_ok,
  cmd.is_encadrant,
  cmd.board_role,
  cmd.apnea_level
FROM public.club_members_directory cmd
WHERE NOT EXISTS (
  SELECT 1 FROM public.membership_yearly_status mys 
  WHERE mys.member_id = cmd.id AND mys.season_year = 2025
)
ON CONFLICT DO NOTHING;

-- 3. Update existing 2025 entries with the additional fields from club_members_directory
UPDATE public.membership_yearly_status mys
SET 
  is_encadrant = cmd.is_encadrant,
  board_role = cmd.board_role,
  apnea_level = cmd.apnea_level
FROM public.club_members_directory cmd
WHERE mys.member_id = cmd.id AND mys.season_year = 2025;

-- 4. Remove seasonal columns from club_members_directory (they are now in membership_yearly_status)
ALTER TABLE public.club_members_directory
DROP COLUMN IF EXISTS payment_status,
DROP COLUMN IF EXISTS medical_certificate_ok,
DROP COLUMN IF EXISTS buddies_charter_signed,
DROP COLUMN IF EXISTS fsgt_insurance_ok,
DROP COLUMN IF EXISTS is_encadrant,
DROP COLUMN IF EXISTS board_role,
DROP COLUMN IF EXISTS apnea_level;