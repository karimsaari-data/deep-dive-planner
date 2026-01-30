-- ÉTAPE 1: Table boats (Flotte externe)
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
  ADD COLUMN boat_id UUID REFERENCES public.boats(id) ON DELETE SET NULL;