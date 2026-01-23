-- Create the carpools table for managing carpool offers
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
CREATE INDEX idx_carpool_passengers_carpool_id ON public.carpool_passengers(carpool_id);