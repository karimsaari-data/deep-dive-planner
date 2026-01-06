-- Create membership_yearly_status table for tracking member status per season
CREATE TABLE public.membership_yearly_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.club_members_directory(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,
  payment_status BOOLEAN NOT NULL DEFAULT false,
  medical_certificate_ok BOOLEAN NOT NULL DEFAULT false,
  buddies_charter_signed BOOLEAN NOT NULL DEFAULT false,
  fsgt_insurance_ok BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, season_year)
);

-- Enable RLS
ALTER TABLE public.membership_yearly_status ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admins can manage membership status"
ON public.membership_yearly_status
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing data from club_members_directory to the new table (for current season 2025)
INSERT INTO public.membership_yearly_status (member_id, season_year, payment_status, medical_certificate_ok, buddies_charter_signed, fsgt_insurance_ok)
SELECT id, 2025, payment_status, medical_certificate_ok, buddies_charter_signed, fsgt_insurance_ok
FROM public.club_members_directory;

-- Add updated_at trigger
CREATE TRIGGER update_membership_yearly_status_updated_at
BEFORE UPDATE ON public.membership_yearly_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();