-- Create enum for outing types
CREATE TYPE public.outing_type AS ENUM ('Fosse', 'Mer', 'Piscine', 'Étang');

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'organizer', 'member');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  apnea_level TEXT,
  specialty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  UNIQUE (user_id, role)
);

-- Create outings table
CREATE TABLE public.outings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  organizer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  outing_type outing_type NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reservations table
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outing_id UUID REFERENCES public.outings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (outing_id, user_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Outings policies
CREATE POLICY "Anyone can view outings"
  ON public.outings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and organizers can create outings"
  ON public.outings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'organizer')
  );

CREATE POLICY "Admins and organizers can update outings"
  ON public.outings FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'organizer')
  );

CREATE POLICY "Admins can delete outings"
  ON public.outings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Reservations policies
CREATE POLICY "Users can view all reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own reservations"
  ON public.reservations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reservations"
  ON public.reservations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_outings_updated_at
  BEFORE UPDATE ON public.outings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();-- Add new outing type 'Dépollution'
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
  EXECUTE FUNCTION public.update_updated_at_column();-- Create storage bucket for outing gallery photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('outings_gallery', 'outings_gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for outings_gallery
CREATE POLICY "Anyone can view outing photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'outings_gallery');

CREATE POLICY "Organizers can upload outing photos" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'outings_gallery' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'organizer')
  )
);

CREATE POLICY "Organizers can delete outing photos" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'outings_gallery' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'organizer')
  )
);

-- Add photos column to outings table
ALTER TABLE public.outings 
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Create a view for outings that hides session_report for regular members
-- We'll handle this in the application layer with RLS since views are complex
-- Instead, we'll rely on client-side filtering based on user role

-- Create function to check if user is encadrant (Encadrant member_status OR organizer/admin role)
CREATE OR REPLACE FUNCTION public.is_encadrant_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id AND member_status = 'Encadrant'
  )
  OR public.has_role(_user_id, 'admin')
  OR public.has_role(_user_id, 'organizer')
$$;-- Add GPS coordinates columns to locations table
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS longitude double precision;-- Add new columns to locations table
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS max_depth numeric,
ADD COLUMN IF NOT EXISTS comments text;-- Add DELETE policy for profiles (admin only)
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for reservations (admin only)
CREATE POLICY "Admins can delete reservations"
  ON public.reservations FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));-- Create admin-only RPC function for club statistics
CREATE OR REPLACE FUNCTION public.get_club_stats(p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  start_of_year TIMESTAMPTZ;
  end_of_year TIMESTAMPTZ;
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  start_of_year := make_timestamptz(p_year, 1, 1, 0, 0, 0);
  end_of_year := make_timestamptz(p_year, 12, 31, 23, 59, 59);

  SELECT json_build_object(
    'totalOutings', (
      SELECT COUNT(*) FROM outings 
      WHERE date_time >= start_of_year AND date_time <= end_of_year
    ),
    'avgOccupation', (
      SELECT COALESCE(ROUND(AVG(
        CASE WHEN o.max_participants > 0 THEN
          (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé')::numeric 
          / o.max_participants * 100
        ELSE 0 END
      )), 0)
      FROM outings o
      WHERE o.date_time >= start_of_year AND o.date_time <= end_of_year
    ),
    'presenceRate', (
      SELECT COALESCE(ROUND(
        (SELECT COUNT(*) FROM reservations r 
         JOIN outings o ON r.outing_id = o.id 
         WHERE o.date_time < NOW() AND r.status = 'confirmé' AND r.is_present = true
         AND o.date_time >= start_of_year AND o.date_time <= end_of_year
         AND (SELECT COUNT(*) FROM reservations r2 WHERE r2.outing_id = o.id AND r2.status = 'confirmé' AND r2.is_present = true) >= 2
        )::numeric /
        NULLIF((SELECT COUNT(*) FROM reservations r 
                JOIN outings o ON r.outing_id = o.id 
                WHERE o.date_time < NOW() AND r.status = 'confirmé' 
                AND o.date_time >= start_of_year AND o.date_time <= end_of_year
                AND (SELECT COUNT(*) FROM reservations r2 WHERE r2.outing_id = o.id AND r2.status = 'confirmé' AND r2.is_present = true) >= 2
               ), 0) * 100
      ), 0)
    ),
    'totalParticipants', (
      SELECT COALESCE(SUM(cnt), 0) FROM (
        SELECT COUNT(*) as cnt FROM reservations r
        JOIN outings o ON r.outing_id = o.id
        WHERE o.date_time >= start_of_year AND o.date_time <= end_of_year
        AND r.status = 'confirmé'
        GROUP BY o.id
      ) sub
    ),
    'typeData', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT outing_type as name, COUNT(*) as value
        FROM outings
        WHERE date_time >= start_of_year AND date_time <= end_of_year
        GROUP BY outing_type
        ORDER BY COUNT(*) DESC
      ) t
    ),
    'monthlyData', (
      SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.month_num), '[]'::json)
      FROM (
        SELECT 
          to_char(date_time, 'Mon') as name,
          EXTRACT(MONTH FROM date_time) as month_num,
          COUNT(*) as sorties
        FROM outings
        WHERE date_time >= start_of_year AND date_time <= end_of_year
        GROUP BY to_char(date_time, 'Mon'), EXTRACT(MONTH FROM date_time)
      ) m
    ),
    'organizerData', (
      SELECT COALESCE(json_agg(row_to_json(org)), '[]'::json)
      FROM (
        SELECT 
          p.first_name || ' ' || p.last_name as name,
          COUNT(*) as count
        FROM outings o
        JOIN profiles p ON o.organizer_id = p.id
        WHERE o.date_time >= start_of_year AND o.date_time <= end_of_year
        GROUP BY p.first_name, p.last_name
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) org
    ),
    'lateCancellationData', (
      SELECT COALESCE(json_agg(row_to_json(lc)), '[]'::json)
      FROM (
        SELECT 
          p.first_name || ' ' || p.last_name as name,
          COUNT(*) as count,
          r.user_id as "userId"
        FROM reservations r
        JOIN outings o ON r.outing_id = o.id
        JOIN profiles p ON r.user_id = p.id
        WHERE r.status = 'annulé'
          AND r.cancelled_at IS NOT NULL
          AND EXTRACT(EPOCH FROM (o.date_time - r.cancelled_at)) / 3600 < 24
          AND EXTRACT(EPOCH FROM (o.date_time - r.cancelled_at)) / 3600 >= 0
          AND o.date_time >= start_of_year AND o.date_time <= end_of_year
        GROUP BY r.user_id, p.first_name, p.last_name
        HAVING COUNT(*) >= 3
        ORDER BY COUNT(*) DESC
      ) lc
    ),
    'presenceComparisonData', (
      SELECT COALESCE(json_agg(row_to_json(pc)), '[]'::json)
      FROM (
        SELECT 
          CASE WHEN length(o.title) > 15 THEN substring(o.title from 1 for 15) || '...' ELSE o.title END as name,
          (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé') as inscrits,
          (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé' AND is_present = true) as "présents"
        FROM outings o
        WHERE o.date_time < NOW()
          AND o.date_time >= start_of_year AND o.date_time <= end_of_year
          AND (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé' AND is_present = true) >= 2
        ORDER BY o.date_time DESC
        LIMIT 10
      ) pc
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute to authenticated users (function handles its own authorization)
GRANT EXECUTE ON FUNCTION public.get_club_stats(INTEGER) TO authenticated;

-- Add database CHECK constraints for input validation
-- Outings table constraints
ALTER TABLE public.outings
  ADD CONSTRAINT check_title_length 
    CHECK (char_length(TRIM(title)) >= 3 AND char_length(title) <= 100),
  ADD CONSTRAINT check_description_length 
    CHECK (description IS NULL OR char_length(description) <= 500),
  ADD CONSTRAINT check_location_length 
    CHECK (char_length(TRIM(location)) >= 3 AND char_length(location) <= 200),
  ADD CONSTRAINT check_max_participants_range 
    CHECK (max_participants >= 1 AND max_participants <= 100);

-- Profiles table constraints  
ALTER TABLE public.profiles
  ADD CONSTRAINT check_first_name_length
    CHECK (char_length(TRIM(first_name)) >= 1 AND char_length(first_name) <= 50),
  ADD CONSTRAINT check_last_name_length
    CHECK (char_length(TRIM(last_name)) >= 1 AND char_length(last_name) <= 50),
  ADD CONSTRAINT check_apnea_level_length
    CHECK (apnea_level IS NULL OR char_length(apnea_level) <= 100),
  ADD CONSTRAINT check_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Reservations table constraints
ALTER TABLE public.reservations
  ADD CONSTRAINT check_carpool_seats_range
    CHECK (carpool_seats IS NULL OR (carpool_seats >= 0 AND carpool_seats <= 10));

-- Locations table constraints
ALTER TABLE public.locations
  ADD CONSTRAINT check_location_name_length
    CHECK (char_length(TRIM(name)) >= 2 AND char_length(name) <= 100),
  ADD CONSTRAINT check_max_depth_range
    CHECK (max_depth IS NULL OR (max_depth >= 0 AND max_depth <= 500));CREATE OR REPLACE FUNCTION public.get_club_stats(p_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
  start_of_year TIMESTAMPTZ;
  end_of_year TIMESTAMPTZ;
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  start_of_year := make_timestamptz(p_year, 1, 1, 0, 0, 0);
  end_of_year := make_timestamptz(p_year, 12, 31, 23, 59, 59);

  SELECT json_build_object(
    'totalOutings', (
      -- Only count past outings with at least 2 present participants
      SELECT COUNT(*) FROM outings o
      WHERE o.date_time >= start_of_year 
        AND o.date_time <= end_of_year
        AND o.date_time < NOW()
        AND (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true) >= 2
    ),
    'avgOccupation', (
      SELECT COALESCE(ROUND(AVG(
        CASE WHEN o.max_participants > 0 THEN
          (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé' AND is_present = true)::numeric 
          / o.max_participants * 100
        ELSE 0 END
      )), 0)
      FROM outings o
      WHERE o.date_time >= start_of_year 
        AND o.date_time <= end_of_year
        AND o.date_time < NOW()
        AND (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true) >= 2
    ),
    'presenceRate', (
      SELECT COALESCE(ROUND(
        (SELECT COUNT(*) FROM reservations r 
         JOIN outings o ON r.outing_id = o.id 
         WHERE o.date_time < NOW() AND r.status = 'confirmé' AND r.is_present = true
         AND o.date_time >= start_of_year AND o.date_time <= end_of_year
         AND (SELECT COUNT(*) FROM reservations r2 WHERE r2.outing_id = o.id AND r2.status = 'confirmé' AND r2.is_present = true) >= 2
        )::numeric /
        NULLIF((SELECT COUNT(*) FROM reservations r 
                JOIN outings o ON r.outing_id = o.id 
                WHERE o.date_time < NOW() AND r.status = 'confirmé' 
                AND o.date_time >= start_of_year AND o.date_time <= end_of_year
                AND (SELECT COUNT(*) FROM reservations r2 WHERE r2.outing_id = o.id AND r2.status = 'confirmé' AND r2.is_present = true) >= 2
               ), 0) * 100
      ), 0)
    ),
    'totalParticipants', (
      SELECT COALESCE(SUM(cnt), 0) FROM (
        SELECT COUNT(*) as cnt FROM reservations r
        JOIN outings o ON r.outing_id = o.id
        WHERE o.date_time >= start_of_year 
          AND o.date_time <= end_of_year
          AND o.date_time < NOW()
          AND r.status = 'confirmé'
          AND r.is_present = true
          AND (SELECT COUNT(*) FROM reservations r2 WHERE r2.outing_id = o.id AND r2.status = 'confirmé' AND r2.is_present = true) >= 2
        GROUP BY o.id
      ) sub
    ),
    'typeData', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT o.outing_type as name, COUNT(*) as value
        FROM outings o
        WHERE o.date_time >= start_of_year 
          AND o.date_time <= end_of_year
          AND o.date_time < NOW()
          AND (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true) >= 2
        GROUP BY o.outing_type
        ORDER BY COUNT(*) DESC
      ) t
    ),
    'monthlyData', (
      SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.month_num), '[]'::json)
      FROM (
        SELECT 
          to_char(o.date_time, 'Mon') as name,
          EXTRACT(MONTH FROM o.date_time) as month_num,
          COUNT(*) as sorties
        FROM outings o
        WHERE o.date_time >= start_of_year 
          AND o.date_time <= end_of_year
          AND o.date_time < NOW()
          AND (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true) >= 2
        GROUP BY to_char(o.date_time, 'Mon'), EXTRACT(MONTH FROM o.date_time)
      ) m
    ),
    'organizerData', (
      SELECT COALESCE(json_agg(row_to_json(org)), '[]'::json)
      FROM (
        SELECT 
          p.first_name || ' ' || p.last_name as name,
          COUNT(*) as count
        FROM outings o
        JOIN profiles p ON o.organizer_id = p.id
        WHERE o.date_time >= start_of_year 
          AND o.date_time <= end_of_year
          AND o.date_time < NOW()
          AND (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true) >= 2
        GROUP BY p.first_name, p.last_name
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) org
    ),
    'lateCancellationData', (
      SELECT COALESCE(json_agg(row_to_json(lc)), '[]'::json)
      FROM (
        SELECT 
          p.first_name || ' ' || p.last_name as name,
          COUNT(*) as count,
          r.user_id as "userId"
        FROM reservations r
        JOIN outings o ON r.outing_id = o.id
        JOIN profiles p ON r.user_id = p.id
        WHERE r.status = 'annulé'
          AND r.cancelled_at IS NOT NULL
          AND EXTRACT(EPOCH FROM (o.date_time - r.cancelled_at)) / 3600 < 24
          AND EXTRACT(EPOCH FROM (o.date_time - r.cancelled_at)) / 3600 >= 0
          AND o.date_time >= start_of_year AND o.date_time <= end_of_year
        GROUP BY r.user_id, p.first_name, p.last_name
        HAVING COUNT(*) >= 3
        ORDER BY COUNT(*) DESC
      ) lc
    ),
    'presenceComparisonData', (
      SELECT COALESCE(json_agg(row_to_json(pc)), '[]'::json)
      FROM (
        SELECT 
          CASE WHEN length(o.title) > 15 THEN substring(o.title from 1 for 15) || '...' ELSE o.title END as name,
          (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé') as inscrits,
          (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé' AND is_present = true) as "présents"
        FROM outings o
        WHERE o.date_time < NOW()
          AND o.date_time >= start_of_year AND o.date_time <= end_of_year
          AND (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé' AND is_present = true) >= 2
        ORDER BY o.date_time DESC
        LIMIT 10
      ) pc
    )
  ) INTO result;

  RETURN result;
END;
$function$;-- Add member_code column to profiles
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
-- Add is_deleted column to outings table for soft delete
ALTER TABLE public.outings 
ADD COLUMN is_deleted boolean NOT NULL DEFAULT false;

-- Create index for faster queries on non-deleted outings
CREATE INDEX idx_outings_is_deleted ON public.outings(is_deleted) WHERE is_deleted = false;
-- Create equipment status enum
CREATE TYPE public.equipment_status AS ENUM ('disponible', 'prêté', 'perdu', 'cassé', 'rebuté');

-- Create equipment catalog table (generic items created by admins)
CREATE TABLE public.equipment_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment inventory table (individual items assigned to organizers)
CREATE TABLE public.equipment_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_id UUID NOT NULL REFERENCES public.equipment_catalog(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status equipment_status NOT NULL DEFAULT 'disponible',
  notes TEXT,
  acquired_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment history table (track all movements and status changes)
CREATE TABLE public.equipment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.equipment_inventory(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'transfer', 'status_change', 'acquisition', 'decommission'
  from_user_id UUID REFERENCES public.profiles(id),
  to_user_id UUID REFERENCES public.profiles(id),
  old_status equipment_status,
  new_status equipment_status,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.equipment_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_history ENABLE ROW LEVEL SECURITY;

-- Catalog policies (admins manage, organizers/admins can view)
CREATE POLICY "Admins can manage catalog"
ON public.equipment_catalog
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Organizers can view catalog"
ON public.equipment_catalog
FOR SELECT
USING (is_encadrant_or_admin(auth.uid()));

-- Inventory policies
CREATE POLICY "Organizers can view all inventory"
ON public.equipment_inventory
FOR SELECT
USING (is_encadrant_or_admin(auth.uid()));

CREATE POLICY "Organizers can manage their own inventory"
ON public.equipment_inventory
FOR ALL
USING (is_encadrant_or_admin(auth.uid()) AND owner_id = auth.uid());

CREATE POLICY "Organizers can insert inventory"
ON public.equipment_inventory
FOR INSERT
WITH CHECK (is_encadrant_or_admin(auth.uid()));

CREATE POLICY "Organizers can update any inventory for transfers"
ON public.equipment_inventory
FOR UPDATE
USING (is_encadrant_or_admin(auth.uid()));

-- History policies
CREATE POLICY "Organizers can view history"
ON public.equipment_history
FOR SELECT
USING (is_encadrant_or_admin(auth.uid()));

CREATE POLICY "Organizers can insert history"
ON public.equipment_history
FOR INSERT
WITH CHECK (is_encadrant_or_admin(auth.uid()));

-- Create indexes
CREATE INDEX idx_equipment_inventory_owner ON public.equipment_inventory(owner_id);
CREATE INDEX idx_equipment_inventory_catalog ON public.equipment_inventory(catalog_id);
CREATE INDEX idx_equipment_inventory_status ON public.equipment_inventory(status);
CREATE INDEX idx_equipment_history_inventory ON public.equipment_history(inventory_id);

-- Create triggers for updated_at
CREATE TRIGGER update_equipment_catalog_updated_at
BEFORE UPDATE ON public.equipment_catalog
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_inventory_updated_at
BEFORE UPDATE ON public.equipment_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();-- Add photo_url and unique_code columns to equipment_inventory
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
EXECUTE FUNCTION public.generate_equipment_code();-- Add is_archived column to outings table
ALTER TABLE public.outings
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;-- Allow authenticated users to see profiles of participants in the same outings
CREATE POLICY "Members can view participant profiles in outings" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.reservations r1
    JOIN public.reservations r2 ON r1.outing_id = r2.outing_id
    WHERE r1.user_id = auth.uid() 
    AND r2.user_id = profiles.id
    AND r1.status != 'annulé'
    AND r2.status != 'annulé'
  )
);-- Create a function to get the confirmed count for an outing (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_outing_confirmed_count(outing_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.reservations
  WHERE outing_id = outing_uuid
    AND status = 'confirmé'
$$;-- Create a security definer function to get outing participants
-- This bypasses RLS to show all confirmed participants to members of the same outing
CREATE OR REPLACE FUNCTION public.get_outing_participants(outing_uuid uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  member_status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.member_status::text
  FROM public.reservations r
  JOIN public.profiles p ON r.user_id = p.id
  WHERE r.outing_id = outing_uuid
    AND r.status = 'confirmé'
  ORDER BY 
    CASE WHEN p.member_status = 'Encadrant' THEN 0 ELSE 1 END,
    p.first_name
$$;-- Add staff-only column to outings table
ALTER TABLE public.outings ADD COLUMN is_staff_only boolean NOT NULL DEFAULT false;

-- Create a function to check if user is staff (encadrant or admin)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id AND member_status = 'Encadrant'
  )
  OR public.has_role(_user_id, 'admin')
  OR public.has_role(_user_id, 'organizer')
$$;

-- Update RLS policy for viewing outings - restrict staff-only outings
DROP POLICY IF EXISTS "Anyone can view outings" ON public.outings;

CREATE POLICY "Anyone can view public outings"
ON public.outings
FOR SELECT
USING (
  (is_staff_only = false) 
  OR 
  (is_staff_only = true AND public.is_staff(auth.uid()))
);

-- Update RLS policy for reservations - prevent non-staff from registering to staff-only outings
CREATE POLICY "Prevent non-staff registration to staff outings"
ON public.reservations
FOR INSERT
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.outings 
    WHERE id = outing_id 
    AND is_staff_only = true 
    AND NOT public.is_staff(auth.uid())
  )
);-- Add estimated_value column to equipment_catalog table
ALTER TABLE public.equipment_catalog
ADD COLUMN estimated_value numeric DEFAULT 0;-- Create sequence for member IDs
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
  EXECUTE FUNCTION public.update_updated_at_column();-- Add new columns to club_members_directory
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
ALTER TABLE public.club_members_directory DROP COLUMN IF EXISTS emergency_contact;-- Add 4 boolean columns for administrative tracking
ALTER TABLE public.club_members_directory 
  ADD COLUMN payment_status BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN medical_certificate_ok BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN buddies_charter_signed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN fsgt_insurance_ok BOOLEAN NOT NULL DEFAULT false;-- Create membership_yearly_status table for tracking member status per season
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
EXECUTE FUNCTION public.update_updated_at_column();-- Add policy allowing users to view their own record in club_members_directory
CREATE POLICY "Users can view their own directory record"
ON public.club_members_directory
FOR SELECT
USING (LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid())));

-- Add policy allowing users to update their own contact info in club_members_directory
CREATE POLICY "Users can update their own contact info"
ON public.club_members_directory
FOR UPDATE
USING (LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid())))-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage club members directory" ON public.club_members_directory;
DROP POLICY IF EXISTS "Users can view their own directory record" ON public.club_members_directory;
DROP POLICY IF EXISTS "Users can update their own contact info" ON public.club_members_directory;

-- Recreate as PERMISSIVE policies (default behavior)
CREATE POLICY "Admins can manage club members directory" 
ON public.club_members_directory 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own directory record" 
ON public.club_members_directory 
FOR SELECT 
TO authenticated
USING (LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "Users can update their own contact info" 
ON public.club_members_directory 
FOR UPDATE 
TO authenticated
USING (LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid())));-- Avoid referencing auth.users in RLS (can cause permission errors)
-- Use the email from the JWT instead.

ALTER POLICY "Users can view their own directory record"
ON public.club_members_directory
USING (lower(email) = lower((auth.jwt() ->> 'email')));

ALTER POLICY "Users can update their own contact info"
ON public.club_members_directory
USING (lower(email) = lower((auth.jwt() ->> 'email')))
WITH CHECK (lower(email) = lower((auth.jwt() ->> 'email')));-- Add board_role column for bureau members
ALTER TABLE public.club_members_directory
ADD COLUMN board_role TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.club_members_directory.board_role IS 'Role in the club bureau: Président, Vice-Président, Trésorier, Secrétaire, etc.';-- Add policy for authenticated users to view all members in directory (for Trombinoscope)
CREATE POLICY "Authenticated users can view directory for trombinoscope"
ON public.club_members_directory
FOR SELECT
TO authenticated
USING (true);-- Add is_encadrant column to club_members_directory
ALTER TABLE public.club_members_directory
ADD COLUMN is_encadrant BOOLEAN NOT NULL DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN public.club_members_directory.is_encadrant IS 'Indicates if the member is a staff/encadrant (source of truth for this status)';-- Drop the overly permissive policy that exposes all data
DROP POLICY IF EXISTS "Authenticated users can view directory for trombinoscope" ON public.club_members_directory;

-- Create a secure view for trombinoscope that only exposes non-sensitive fields
CREATE OR REPLACE VIEW public.club_members_trombinoscope AS
SELECT 
  id,
  first_name,
  last_name,
  apnea_level,
  board_role,
  is_encadrant,
  email  -- Only needed for avatar matching, but email is less sensitive than full contact info
FROM public.club_members_directory;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.club_members_trombinoscope TO authenticated;

-- Add a security definer function to safely check if user can access full member data
CREATE OR REPLACE FUNCTION public.can_view_member_details(_member_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(auth.uid(), 'admin') 
    OR lower(_member_email) = lower((auth.jwt() ->> 'email')::text)
$$;

-- Create a new restrictive SELECT policy that only allows:
-- 1. Admins to see everything
-- 2. Users to see their own record
CREATE POLICY "Admins can view all directory records"
ON public.club_members_directory
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Note: The existing "Users can view their own directory record" policy already handles self-access-- Drop the security definer view and recreate as SECURITY INVOKER (default, safer)
DROP VIEW IF EXISTS public.club_members_trombinoscope;

-- Recreate view with SECURITY INVOKER (explicit) - queries run with caller's permissions
CREATE VIEW public.club_members_trombinoscope 
WITH (security_invoker = true)
AS
SELECT 
  id,
  first_name,
  last_name,
  apnea_level,
  board_role,
  is_encadrant,
  email
FROM public.club_members_directory;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.club_members_trombinoscope TO authenticated;

-- Add a permissive SELECT policy on the base table for authenticated users
-- but ONLY for the limited columns they can access via the view
-- Since views with security_invoker check RLS on base table, we need to allow SELECT
CREATE POLICY "Authenticated can select for trombinoscope view"
ON public.club_members_directory
FOR SELECT
TO authenticated
USING (true);-- Clean up: drop the view and the too-permissive policy
DROP VIEW IF EXISTS public.club_members_trombinoscope;
DROP POLICY IF EXISTS "Authenticated can select for trombinoscope view" ON public.club_members_directory;
DROP POLICY IF EXISTS "Admins can view all directory records" ON public.club_members_directory;

-- Create a SECURITY DEFINER function to safely return only trombinoscope data
-- This function runs with elevated privileges but only returns non-sensitive fields
CREATE OR REPLACE FUNCTION public.get_trombinoscope_members()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  apnea_level text,
  board_role text,
  is_encadrant boolean,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    first_name,
    last_name,
    apnea_level,
    board_role,
    is_encadrant,
    email
  FROM public.club_members_directory
  ORDER BY last_name ASC;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_trombinoscope_members() TO authenticated;-- Drop and recreate the function with avatar_url included
DROP FUNCTION IF EXISTS public.get_trombinoscope_members();

CREATE FUNCTION public.get_trombinoscope_members()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  apnea_level text,
  board_role text,
  is_encadrant boolean,
  email text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cmd.id,
    cmd.first_name,
    cmd.last_name,
    cmd.apnea_level,
    cmd.board_role,
    cmd.is_encadrant,
    cmd.email,
    p.avatar_url
  FROM public.club_members_directory cmd
  LEFT JOIN public.profiles p ON lower(cmd.email) = lower(p.email)
  ORDER BY cmd.last_name ASC;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_trombinoscope_members() TO authenticated;-- Create a security definer function to check if current user is encadrant
CREATE OR REPLACE FUNCTION public.is_current_user_encadrant()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_encadrant 
     FROM public.club_members_directory 
     WHERE lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
     LIMIT 1),
    false
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_current_user_encadrant() TO authenticated;-- Create a table to store historical outing participants
-- These participants are linked to club_members_directory, not to app profiles
CREATE TABLE public.historical_outing_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outing_id UUID NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.club_members_directory(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(outing_id, member_id)
);

-- Enable RLS
ALTER TABLE public.historical_outing_participants ENABLE ROW LEVEL SECURITY;

-- Admins and organizers can manage historical participants
CREATE POLICY "Admins and organizers can manage historical participants"
ON public.historical_outing_participants
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'organizer'));

-- Anyone can view historical participants
CREATE POLICY "Anyone can view historical participants"
ON public.historical_outing_participants
FOR SELECT
USING (true);

-- Add index for better query performance
CREATE INDEX idx_historical_participants_outing ON public.historical_outing_participants(outing_id);
CREATE INDEX idx_historical_participants_member ON public.historical_outing_participants(member_id);-- Update get_club_stats function to include historical outings in all statistics
CREATE OR REPLACE FUNCTION public.get_club_stats(p_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
  start_of_year TIMESTAMPTZ;
  end_of_year TIMESTAMPTZ;
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  start_of_year := make_timestamptz(p_year, 1, 1, 0, 0, 0);
  end_of_year := make_timestamptz(p_year, 12, 31, 23, 59, 59);

  SELECT json_build_object(
    'totalOutings', (
      -- Count past outings with either:
      -- 1. At least 2 present participants (regular outings)
      -- 2. OR has historical participants (historical outings)
      SELECT COUNT(*) FROM outings o
      WHERE o.date_time >= start_of_year 
        AND o.date_time <= end_of_year
        AND o.date_time < NOW()
        AND (
          (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true) >= 2
          OR EXISTS (SELECT 1 FROM historical_outing_participants hop WHERE hop.outing_id = o.id)
        )
    ),
    'avgOccupation', (
      SELECT COALESCE(ROUND(AVG(
        CASE WHEN o.max_participants > 0 THEN
          GREATEST(
            (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé' AND is_present = true)::numeric,
            (SELECT COUNT(*) FROM historical_outing_participants WHERE outing_id = o.id)::numeric
          ) / o.max_participants * 100
        ELSE 0 END
      )), 0)
      FROM outings o
      WHERE o.date_time >= start_of_year 
        AND o.date_time <= end_of_year
        AND o.date_time < NOW()
        AND (
          (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true) >= 2
          OR EXISTS (SELECT 1 FROM historical_outing_participants hop WHERE hop.outing_id = o.id)
        )
    ),
    'presenceRate', (
      SELECT COALESCE(ROUND(
        (SELECT COUNT(*) FROM reservations r 
         JOIN outings o ON r.outing_id = o.id 
         WHERE o.date_time < NOW() AND r.status = 'confirmé' AND r.is_present = true
         AND o.date_time >= start_of_year AND o.date_time <= end_of_year
         AND (SELECT COUNT(*) FROM reservations r2 WHERE r2.outing_id = o.id AND r2.status = 'confirmé' AND r2.is_present = true) >= 2
        )::numeric /
        NULLIF((SELECT COUNT(*) FROM reservations r 
                JOIN outings o ON r.outing_id = o.id 
                WHERE o.date_time < NOW() AND r.status = 'confirmé' 
                AND o.date_time >= start_of_year AND o.date_time <= end_of_year
                AND (SELECT COUNT(*) FROM reservations r2 WHERE r2.outing_id = o.id AND r2.status = 'confirmé' AND r2.is_present = true) >= 2
               ), 0) * 100
      ), 0)
    ),
    'totalParticipants', (
      SELECT COALESCE(SUM(cnt), 0) FROM (
        -- Regular outing participants
        SELECT COUNT(*) as cnt FROM reservations r
        JOIN outings o ON r.outing_id = o.id
        WHERE o.date_time >= start_of_year 
          AND o.date_time <= end_of_year
          AND o.date_time < NOW()
          AND r.status = 'confirmé'
          AND r.is_present = true
          AND (SELECT COUNT(*) FROM reservations r2 WHERE r2.outing_id = o.id AND r2.status = 'confirmé' AND r2.is_present = true) >= 2
          AND NOT EXISTS (SELECT 1 FROM historical_outing_participants hop WHERE hop.outing_id = o.id)
        GROUP BY o.id
        UNION ALL
        -- Historical outing participants
        SELECT COUNT(*) as cnt FROM historical_outing_participants hop
        JOIN outings o ON hop.outing_id = o.id
        WHERE o.date_time >= start_of_year 
          AND o.date_time <= end_of_year
          AND o.date_time < NOW()
        GROUP BY o.id
      ) sub
    ),
    'typeData', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT o.outing_type as name, COUNT(*) as value
        FROM outings o
        WHERE o.date_time >= start_of_year 
          AND o.date_time <= end_of_year
          AND o.date_time < NOW()
          AND (
            (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true) >= 2
            OR EXISTS (SELECT 1 FROM historical_outing_participants hop WHERE hop.outing_id = o.id)
          )
        GROUP BY o.outing_type
        ORDER BY COUNT(*) DESC
      ) t
    ),
    'monthlyData', (
      SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.month_num), '[]'::json)
      FROM (
        SELECT 
          to_char(o.date_time, 'Mon') as name,
          EXTRACT(MONTH FROM o.date_time) as month_num,
          COUNT(*) as sorties
        FROM outings o
        WHERE o.date_time >= start_of_year 
          AND o.date_time <= end_of_year
          AND o.date_time < NOW()
          AND (
            (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true) >= 2
            OR EXISTS (SELECT 1 FROM historical_outing_participants hop WHERE hop.outing_id = o.id)
          )
        GROUP BY to_char(o.date_time, 'Mon'), EXTRACT(MONTH FROM o.date_time)
      ) m
    ),
    'organizerData', (
      SELECT COALESCE(json_agg(row_to_json(org)), '[]'::json)
      FROM (
        SELECT 
          p.first_name || ' ' || p.last_name as name,
          COUNT(*) as count
        FROM outings o
        JOIN profiles p ON o.organizer_id = p.id
        WHERE o.date_time >= start_of_year 
          AND o.date_time <= end_of_year
          AND o.date_time < NOW()
          AND (
            (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true) >= 2
            OR EXISTS (SELECT 1 FROM historical_outing_participants hop WHERE hop.outing_id = o.id)
          )
        GROUP BY p.first_name, p.last_name
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) org
    ),
    'lateCancellationData', (
      SELECT COALESCE(json_agg(row_to_json(lc)), '[]'::json)
      FROM (
        SELECT 
          p.first_name || ' ' || p.last_name as name,
          COUNT(*) as count,
          r.user_id as "userId"
        FROM reservations r
        JOIN outings o ON r.outing_id = o.id
        JOIN profiles p ON r.user_id = p.id
        WHERE r.status = 'annulé'
          AND r.cancelled_at IS NOT NULL
          AND EXTRACT(EPOCH FROM (o.date_time - r.cancelled_at)) / 3600 < 24
          AND EXTRACT(EPOCH FROM (o.date_time - r.cancelled_at)) / 3600 >= 0
          AND o.date_time >= start_of_year AND o.date_time <= end_of_year
        GROUP BY r.user_id, p.first_name, p.last_name
        HAVING COUNT(*) >= 3
        ORDER BY COUNT(*) DESC
      ) lc
    ),
    'presenceComparisonData', (
      SELECT COALESCE(json_agg(row_to_json(pc)), '[]'::json)
      FROM (
        SELECT 
          CASE WHEN length(o.title) > 15 THEN substring(o.title from 1 for 15) || '...' ELSE o.title END as name,
          GREATEST(
            (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé'),
            (SELECT COUNT(*) FROM historical_outing_participants WHERE outing_id = o.id)
          ) as inscrits,
          GREATEST(
            (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé' AND is_present = true),
            (SELECT COUNT(*) FROM historical_outing_participants WHERE outing_id = o.id)
          ) as "présents"
        FROM outings o
        WHERE o.date_time < NOW()
          AND o.date_time >= start_of_year AND o.date_time <= end_of_year
          AND (
            (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé' AND is_present = true) >= 2
            OR EXISTS (SELECT 1 FROM historical_outing_participants hop WHERE hop.outing_id = o.id)
          )
        ORDER BY o.date_time DESC
        LIMIT 10
      ) pc
    )
  ) INTO result;

  RETURN result;
END;
$function$;-- Create the carpools table for managing carpool offers
CREATE TABLE public.carpools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outing_id UUID NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  departure_time TIME NOT NULL,
  available_seats INTEGER NOT NULL CHECK (available_seats > 0 AND available_seats <= 8),
  meeting_point TEXT NOT NULL,
  maps_link TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(outing_id, driver_id)
);

-- Create the carpool_passengers table for managing passengers
CREATE TABLE public.carpool_passengers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  carpool_id UUID NOT NULL REFERENCES public.carpools(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(carpool_id, passenger_id)
);

-- Enable RLS
ALTER TABLE public.carpools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carpool_passengers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for carpools
-- Anyone with a reservation can view carpools for that outing
CREATE POLICY "Participants can view carpools"
  ON public.carpools
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.outing_id = carpools.outing_id
        AND r.user_id = auth.uid()
        AND r.status != 'annulé'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'organizer'::app_role)
  );

-- Drivers can create their own carpool
CREATE POLICY "Drivers can create carpools"
  ON public.carpools
  FOR INSERT
  WITH CHECK (
    auth.uid() = driver_id
    AND EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.outing_id = carpools.outing_id
        AND r.user_id = auth.uid()
        AND r.status = 'confirmé'
        AND r.carpool_option = 'driver'
    )
  );

-- Drivers can update their own carpool
CREATE POLICY "Drivers can update their carpools"
  ON public.carpools
  FOR UPDATE
  USING (auth.uid() = driver_id);

-- Drivers can delete their own carpool
CREATE POLICY "Drivers can delete their carpools"
  ON public.carpools
  FOR DELETE
  USING (auth.uid() = driver_id);

-- RLS Policies for carpool_passengers
-- Participants can view passengers
CREATE POLICY "Participants can view passengers"
  ON public.carpool_passengers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.carpools c
      JOIN public.reservations r ON r.outing_id = c.outing_id
      WHERE c.id = carpool_passengers.carpool_id
        AND r.user_id = auth.uid()
        AND r.status != 'annulé'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Passengers can book themselves
CREATE POLICY "Passengers can book themselves"
  ON public.carpool_passengers
  FOR INSERT
  WITH CHECK (
    auth.uid() = passenger_id
    AND EXISTS (
      SELECT 1 FROM public.carpools c
      JOIN public.reservations r ON r.outing_id = c.outing_id
      WHERE c.id = carpool_passengers.carpool_id
        AND r.user_id = auth.uid()
        AND r.status = 'confirmé'
    )
  );

-- Passengers can remove themselves OR driver can remove passengers
CREATE POLICY "Passengers and drivers can delete bookings"
  ON public.carpool_passengers
  FOR DELETE
  USING (
    auth.uid() = passenger_id
    OR EXISTS (
      SELECT 1 FROM public.carpools c
      WHERE c.id = carpool_passengers.carpool_id
        AND c.driver_id = auth.uid()
    )
  );

-- Create trigger for updated_at on carpools
CREATE TRIGGER update_carpools_updated_at
  BEFORE UPDATE ON public.carpools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_carpools_outing_id ON public.carpools(outing_id);
CREATE INDEX idx_carpool_passengers_carpool_id ON public.carpool_passengers(carpool_id);-- Add phone column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone text;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.phone IS 'User phone number for carpool contact';-- Add RLS policy for carpool participants to view driver profiles
CREATE POLICY "Carpool participants can view driver profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM carpools c
    JOIN reservations r ON r.outing_id = c.outing_id
    WHERE c.driver_id = profiles.id
      AND r.user_id = auth.uid()
      AND r.status <> 'annulé'
  )
);-- ÉTAPE 1: Table boats (Flotte externe)
CREATE TABLE public.boats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  registration_number TEXT,
  capacity INTEGER NOT NULL DEFAULT 6,
  pilot_name TEXT,
  pilot_phone TEXT,
  oxygen_location TEXT,
  home_port TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boats ENABLE ROW LEVEL SECURITY;

-- Policies: Admins can manage, everyone can view
CREATE POLICY "Admins can manage boats" ON public.boats
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view boats" ON public.boats
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_boats_updated_at
  BEFORE UPDATE ON public.boats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ÉTAPE 2: Table site_waypoints (Points GPS de sécurité)
CREATE TYPE public.waypoint_type AS ENUM ('parking', 'water_entry', 'water_exit', 'meeting_point');

CREATE TABLE public.site_waypoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  point_type public.waypoint_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_waypoints ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage waypoints" ON public.site_waypoints
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view waypoints" ON public.site_waypoints
  FOR SELECT USING (true);

-- ÉTAPE 3: Colonnes sur outings (Mode de départ)
ALTER TABLE public.outings 
  ADD COLUMN dive_mode TEXT CHECK (dive_mode IN ('boat', 'shore')),
  ADD COLUMN boat_id UUID REFERENCES public.boats(id) ON DELETE SET NULL;-- Add dive_zone to waypoint_type enum
ALTER TYPE public.waypoint_type ADD VALUE IF NOT EXISTS 'dive_zone';

-- Add columns for POSS PDF cartography images
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS satellite_map_url TEXT,
ADD COLUMN IF NOT EXISTS bathymetric_map_url TEXT;-- 1. Add new columns to membership_yearly_status
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
DROP COLUMN IF EXISTS apnea_level;-- Update get_trombinoscope_members to use membership_yearly_status for seasonal data
CREATE OR REPLACE FUNCTION public.get_trombinoscope_members()
 RETURNS TABLE(id uuid, first_name text, last_name text, apnea_level text, board_role text, is_encadrant boolean, email text, avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH current_season AS (
    SELECT CASE 
      WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 9 
      THEN EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1
      ELSE EXTRACT(YEAR FROM CURRENT_DATE)::integer
    END as year
  )
  SELECT 
    cmd.id,
    cmd.first_name,
    cmd.last_name,
    mys.apnea_level,
    mys.board_role,
    COALESCE(mys.is_encadrant, false),
    cmd.email,
    p.avatar_url
  FROM public.club_members_directory cmd
  LEFT JOIN public.profiles p ON lower(cmd.email) = lower(p.email)
  LEFT JOIN public.membership_yearly_status mys ON mys.member_id = cmd.id 
    AND mys.season_year = (SELECT year FROM current_season)
  ORDER BY cmd.last_name ASC;
$function$;

-- Update is_current_user_encadrant to check membership_yearly_status
CREATE OR REPLACE FUNCTION public.is_current_user_encadrant()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH current_season AS (
    SELECT CASE 
      WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 9 
      THEN EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1
      ELSE EXTRACT(YEAR FROM CURRENT_DATE)::integer
    END as year
  )
  SELECT COALESCE(
    (SELECT mys.is_encadrant 
     FROM public.club_members_directory cmd
     JOIN public.membership_yearly_status mys ON mys.member_id = cmd.id
       AND mys.season_year = (SELECT year FROM current_season)
     WHERE lower(cmd.email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
     LIMIT 1),
    false
  );
$function$;-- Add organizer_member_id column to outings table for historical outings
-- This stores the club_members_directory ID of the organizer
-- Used when the organizer doesn't have an app account (no profile)
ALTER TABLE public.outings 
ADD COLUMN organizer_member_id uuid REFERENCES public.club_members_directory(id);

-- Add comment for documentation
COMMENT ON COLUMN public.outings.organizer_member_id IS 'For historical outings: references the organizer in club_members_directory. Used when organizer has no app account (organizer_id is null).';