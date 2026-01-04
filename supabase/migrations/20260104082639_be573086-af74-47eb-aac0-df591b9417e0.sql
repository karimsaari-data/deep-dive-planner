-- Create sequence for member IDs
CREATE SEQUENCE IF NOT EXISTS public.club_member_id_seq START 1;

-- Create club_members_directory table for administrative CRM
CREATE TABLE public.club_members_directory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  birth_date DATE,
  address TEXT,
  apnea_level TEXT,
  joined_at DATE DEFAULT CURRENT_DATE,
  emergency_contact TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.club_members_directory ENABLE ROW LEVEL SECURITY;

-- Only admins can manage the directory
CREATE POLICY "Admins can manage club members directory"
ON public.club_members_directory
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to generate member_id like M0001
CREATE OR REPLACE FUNCTION public.generate_club_member_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_val INTEGER;
BEGIN
  SELECT nextval('public.club_member_id_seq') INTO next_val;
  NEW.member_id := 'M' || LPAD(next_val::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate member_id
CREATE TRIGGER set_club_member_id
  BEFORE INSERT ON public.club_members_directory
  FOR EACH ROW
  WHEN (NEW.member_id IS NULL OR NEW.member_id = '')
  EXECUTE FUNCTION public.generate_club_member_id();

-- Trigger for updated_at
CREATE TRIGGER update_club_members_directory_updated_at
  BEFORE UPDATE ON public.club_members_directory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();