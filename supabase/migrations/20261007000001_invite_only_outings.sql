-- Sorties sur invitation : participants sélectionnés à la création et inscrits
-- d'office ('confirmé'). Les autres membres ne peuvent pas s'inscrire.

ALTER TABLE public.outings
  ADD COLUMN IF NOT EXISTS is_invite_only boolean NOT NULL DEFAULT false;

-- Verrou RLS : seuls l'organisateur, un co-encadrant ou un admin peuvent créer
-- une réservation sur une sortie sur invitation (les invités sont insérés par
-- la RPC SECURITY DEFINER ci-dessous). RESTRICTIVE : s'ajoute aux policies existantes.
DROP POLICY IF EXISTS "Invite-only outings: no self registration" ON public.reservations;
CREATE POLICY "Invite-only outings: no self registration"
ON public.reservations
AS RESTRICTIVE
FOR INSERT
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.outings o
    WHERE o.id = outing_id
      AND o.is_invite_only = true
      AND o.organizer_id <> auth.uid()
      AND NOT public.has_role(auth.uid(), 'admin')
      AND NOT EXISTS (
        SELECT 1 FROM public.outing_co_instructors c
        WHERE c.outing_id = o.id AND c.user_id = auth.uid()
      )
  )
);

-- Pas de limite de capacité sur une sortie sur invitation : la liste est maîtrisée
-- par l'organisateur (évite de basculer des invités en liste d'attente).
CREATE OR REPLACE FUNCTION public.enforce_outing_capacity(p_outing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_max int;
  v_invite_only boolean;
  v_confirmed int;
BEGIN
  SELECT max_participants, is_invite_only INTO v_max, v_invite_only
  FROM public.outings WHERE id = p_outing_id;
  IF v_max IS NULL OR v_invite_only THEN RETURN; END IF;

  WITH ranked AS (
    SELECT r.id,
      row_number() OVER (
        ORDER BY
          CASE
            WHEN r.user_id = o.organizer_id THEN 0
            WHEN EXISTS (SELECT 1 FROM public.outing_co_instructors c
                         WHERE c.outing_id = r.outing_id AND c.user_id = r.user_id) THEN 1
            ELSE 2
          END,
          r.created_at
      ) AS rn
    FROM public.reservations r
    JOIN public.outings o ON o.id = r.outing_id
    WHERE r.outing_id = p_outing_id AND r.status = 'confirmé'
  )
  UPDATE public.reservations
  SET status = 'en_attente'
  WHERE id IN (SELECT id FROM ranked WHERE rn > v_max);

  SELECT count(*) INTO v_confirmed FROM public.reservations
  WHERE outing_id = p_outing_id AND status = 'confirmé';

  IF v_confirmed < v_max THEN
    UPDATE public.reservations
    SET status = 'confirmé'
    WHERE id IN (
      SELECT id FROM public.reservations
      WHERE outing_id = p_outing_id AND status = 'en_attente'
      ORDER BY created_at
      LIMIT (v_max - v_confirmed)
    );
  END IF;
END;
$$;

-- Le recalcul auto de max_participants (niveaux des encadrants) ne s'applique pas
-- aux sorties sur invitation.
CREATE OR REPLACE FUNCTION public.recalculate_outing_max_participants(p_outing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_season_year integer;
  v_total integer := 0;
  v_organizer_id uuid;
  v_invite_only boolean;
BEGIN
  v_season_year := CASE
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 9
    THEN EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1
    ELSE EXTRACT(YEAR FROM CURRENT_DATE)::integer
  END;

  SELECT organizer_id, is_invite_only INTO v_organizer_id, v_invite_only
  FROM public.outings WHERE id = p_outing_id;
  IF v_organizer_id IS NULL OR v_invite_only THEN RETURN; END IF;

  SELECT COALESCE(SUM(al.max_participants_encadrement), 0) INTO v_total
  FROM (
    SELECT p.email FROM public.profiles p WHERE p.id = v_organizer_id
    UNION ALL
    SELECT p.email FROM public.outing_co_instructors oci
    JOIN public.profiles p ON p.id = oci.user_id
    WHERE oci.outing_id = p_outing_id
  ) instructors
  JOIN public.club_members_directory cmd ON lower(cmd.email) = lower(instructors.email)
  JOIN public.membership_yearly_status mys
    ON mys.member_id = cmd.id AND mys.season_year = v_season_year
  JOIN public.apnea_levels al ON al.code = mys.apnea_level
  WHERE al.max_participants_encadrement IS NOT NULL;

  IF v_total > 0 THEN
    UPDATE public.outings SET max_participants = v_total WHERE id = p_outing_id;
  END IF;
END;
$$;

-- RPC de création : ajout de p_is_invite_only et p_participant_ids.
DROP FUNCTION IF EXISTS public.create_outing_with_organizer(
  text, text, timestamptz, timestamptz, text, text, text, uuid, text, int,
  uuid, boolean, text, int, text, uuid
);

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

  -- Invités : dédoublonnés, hors organisateur, uniquement des profils existants
  SELECT COALESCE(array_agg(DISTINCT p.id), '{}') INTO v_invitees
  FROM public.profiles p
  WHERE p.id = ANY(COALESCE(p_participant_ids, '{}'))
    AND p.id <> p_organizer_id;

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
