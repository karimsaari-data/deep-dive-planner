-- Fix : le sélecteur de participants envoie des ids de club_members_directory
-- (get_trombinoscope_members.id), pas des ids de profiles. La RPC résout donc les
-- invités par email (directory -> profiles) et accepte aussi des ids de profiles.
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
  p_boat_id uuid,
  p_is_invite_only boolean DEFAULT false,
  p_participant_ids uuid[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_outing_id uuid;
  v_max int := p_max_participants;
  v_invitees uuid[];
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_organizer_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT p.id), '{}') INTO v_invitees
  FROM public.profiles p
  WHERE p.id <> p_organizer_id
    AND (
      p.id = ANY(COALESCE(p_participant_ids, '{}'))
      OR lower(p.email) IN (
        SELECT lower(cmd.email) FROM public.club_members_directory cmd
        WHERE cmd.id = ANY(COALESCE(p_participant_ids, '{}'))
      )
    );

  IF p_is_invite_only THEN
    v_max := GREATEST(v_max, cardinality(v_invitees) + 1);
  END IF;

  INSERT INTO public.outings (
    title, description, date_time, end_date,
    water_entry_time, water_exit_time,
    location, location_id,
    outing_type, max_participants,
    organizer_id, is_staff_only, is_invite_only,
    dive_mode, boat_id
  ) VALUES (
    p_title, p_description, p_date_time, p_end_date,
    p_water_entry_time::time, p_water_exit_time::time,
    p_location, p_location_id,
    p_outing_type::public.outing_type, v_max,
    p_organizer_id, p_is_staff_only, COALESCE(p_is_invite_only, false),
    p_dive_mode, p_boat_id
  )
  RETURNING id INTO v_outing_id;

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

  IF p_is_invite_only AND cardinality(v_invitees) > 0 THEN
    INSERT INTO public.reservations (outing_id, user_id, status)
    SELECT v_outing_id, u, 'confirmé' FROM unnest(v_invitees) AS u;
  END IF;

  RETURN v_outing_id;
END;
$$;
