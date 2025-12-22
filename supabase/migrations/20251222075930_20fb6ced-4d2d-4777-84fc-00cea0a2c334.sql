-- Add new outing type 'Dépollution'
ALTER TYPE public.outing_type ADD VALUE IF NOT EXISTS 'Dépollution';

-- Create booking status enum
CREATE TYPE public.booking_status AS ENUM ('confirmé', 'annulé', 'en_attente');

-- Create carpool option enum
CREATE TYPE public.carpool_option AS ENUM ('none', 'driver', 'passenger');

-- Create member status enum
CREATE TYPE public.member_status AS ENUM ('Membre', 'Encadrant');

-- Create locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  type TEXT,
  maps_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for locations
CREATE POLICY "Anyone can view locations" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Admins can manage locations" ON public.locations FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Add new columns to outings
ALTER TABLE public.outings 
  ADD COLUMN end_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN location_id UUID REFERENCES public.locations(id),
  ADD COLUMN session_report TEXT,
  ADD COLUMN reminder_sent BOOLEAN DEFAULT false;

-- Add new columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN avatar_url TEXT,
  ADD COLUMN member_status member_status DEFAULT 'Membre';

-- Update apnea_level to be more specific - we'll handle this in UI with dropdown

-- Create new reservations/bookings table structure
-- First drop existing policies
DROP POLICY IF EXISTS "Users can create own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can delete own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can view all reservations" ON public.reservations;

-- Add new columns to reservations
ALTER TABLE public.reservations
  ADD COLUMN status booking_status DEFAULT 'confirmé',
  ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN carpool_option carpool_option DEFAULT 'none',
  ADD COLUMN carpool_seats INTEGER DEFAULT 0,
  ADD COLUMN is_present BOOLEAN DEFAULT false;

-- Create strict RLS policies for reservations
-- Users can view their own reservations
CREATE POLICY "Users can view own reservations" ON public.reservations 
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all reservations
CREATE POLICY "Admins can view all reservations" ON public.reservations 
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Organizers can view reservations for their outings
CREATE POLICY "Organizers can view their outing reservations" ON public.reservations 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.outings 
      WHERE outings.id = reservations.outing_id 
      AND outings.organizer_id = auth.uid()
    )
  );

-- Users can create reservations for themselves
CREATE POLICY "Users can create own reservations" ON public.reservations 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reservations (for cancellation)
CREATE POLICY "Users can update own reservations" ON public.reservations 
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins and organizers can update reservations
CREATE POLICY "Admins can update reservations" ON public.reservations 
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Organizers can update their outing reservations" ON public.reservations 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.outings 
      WHERE outings.id = reservations.outing_id 
      AND outings.organizer_id = auth.uid()
    )
  );

-- Update profiles RLS to be more restrictive for email visibility
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can view their own full profile
CREATE POLICY "Users can view own profile" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles 
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Organizers can view profiles of users registered to their outings
CREATE POLICY "Organizers can view participant profiles" ON public.profiles 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reservations r
      JOIN public.outings o ON r.outing_id = o.id
      WHERE r.user_id = profiles.id 
      AND o.organizer_id = auth.uid()
    )
  );

-- Admin-only update for member_status
CREATE POLICY "Admins can update member status" ON public.profiles
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR auth.uid() = id
  );

-- Function to auto-promote from waitlist when someone cancels
CREATE OR REPLACE FUNCTION public.promote_from_waitlist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_waiting UUID;
  max_spots INTEGER;
  confirmed_count INTEGER;
BEGIN
  -- Only process if status changed to 'annulé'
  IF NEW.status = 'annulé' AND (OLD.status IS NULL OR OLD.status != 'annulé') THEN
    -- Get max participants for this outing
    SELECT max_participants INTO max_spots FROM public.outings WHERE id = NEW.outing_id;
    
    -- Count current confirmed reservations
    SELECT COUNT(*) INTO confirmed_count FROM public.reservations 
    WHERE outing_id = NEW.outing_id AND status = 'confirmé';
    
    -- If there's room, promote the first waiting person
    IF confirmed_count < max_spots THEN
      SELECT id INTO next_waiting FROM public.reservations 
      WHERE outing_id = NEW.outing_id AND status = 'en_attente'
      ORDER BY created_at ASC
      LIMIT 1;
      
      IF next_waiting IS NOT NULL THEN
        UPDATE public.reservations SET status = 'confirmé' WHERE id = next_waiting;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for waitlist promotion
CREATE TRIGGER on_reservation_cancelled
  AFTER UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_from_waitlist();

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects 
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" ON storage.objects 
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add trigger for locations updated_at
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();