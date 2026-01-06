-- Add 4 boolean columns for administrative tracking
ALTER TABLE public.club_members_directory 
  ADD COLUMN payment_status BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN medical_certificate_ok BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN buddies_charter_signed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN fsgt_insurance_ok BOOLEAN NOT NULL DEFAULT false;