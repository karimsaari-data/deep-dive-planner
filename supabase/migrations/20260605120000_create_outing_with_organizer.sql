-- Fonction atomique : crée une sortie ET inscrit l'organisateur en une seule transaction.
-- SECURITY DEFINER pour bypasser les politiques RLS sur reservations.
CREATE OR REPLACE FUNCTION public.create_outing_with_organizer(
  p_title text,
  p_description text,
  p_date_time timestamptz,
  p_end_date timestamptz,
  p_water_entry_time text,
  p_water_exit_time text,
  p_location text,
  p_location_id uuid,
  p_outing_type text,
  p_max_participants int,
  p_organizer_id uuid,
  p_is_staff_only boolean,
  p_carpool_option text,
  p_carpool_seats int,
  p_dive_mode text,
  p_boat_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_outing_id uuid;
BEGIN
  -- Vérification : seul l'utilisateur connecté peut créer pour lui-même
  IF auth.uid() IS NULL OR auth.uid() != p_organizer_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.outings (
    title, description, date_time, end_date,
    water_entry_time, water_exit_time,
    location, location_id,
    outing_type, max_participants,
    organizer_id, is_staff_only,
    dive_mode, boat_id
  ) VALUES (
    p_title, p_description, p_date_time, p_end_date,
    p_water_entry_time, p_water_exit_time,
    p_location, p_location_id,
    p_outing_type::public.outing_type, p_max_participants,
    p_organizer_id, p_is_staff_only,
    p_dive_mode, p_boat_id
  )
  RETURNING id INTO v_outing_id;

  -- Inscription automatique de l'organisateur
  INSERT INTO public.reservations (
    outing_id, user_id, status,
    carpool_option, carpool_seats
  ) VALUES (
    v_outing_id,
    p_organizer_id,
    'confirmé',
    COALESCE(p_carpool_option, 'none')::public.carpool_option,
    CASE WHEN p_carpool_option = 'driver' THEN COALESCE(p_carpool_seats, 1) ELSE 0 END
  );

  RETURN v_outing_id;
END;
$$;
