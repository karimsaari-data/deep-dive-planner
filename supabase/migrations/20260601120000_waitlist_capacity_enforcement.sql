-- 1. get_outing_participants : renvoie aussi les en_attente + statut + created_at
DROP FUNCTION IF EXISTS public.get_outing_participants(uuid);
CREATE FUNCTION public.get_outing_participants(outing_uuid uuid)
RETURNS TABLE(id uuid, first_name text, last_name text, avatar_url text, member_status text, status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.first_name, p.last_name, p.avatar_url, p.member_status::text,
         r.status::text, r.created_at
  FROM public.reservations r
  JOIN public.profiles p ON r.user_id = p.id
  WHERE r.outing_id = outing_uuid
    AND r.status IN ('confirmé', 'en_attente')
  ORDER BY
    CASE WHEN r.status = 'confirmé' THEN 0 ELSE 1 END,
    CASE WHEN p.member_status = 'Encadrant' THEN 0 ELSE 1 END,
    r.created_at;
$$;

-- 2. enforce_outing_capacity : rétrograde le surplus de confirmés (protège
--    organisateur & co-encadrants, puis ordre d'inscription), puis promeut
--    la liste d'attente s'il reste de la place
CREATE OR REPLACE FUNCTION public.enforce_outing_capacity(p_outing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_max int;
  v_confirmed int;
BEGIN
  SELECT max_participants INTO v_max FROM public.outings WHERE id = p_outing_id;
  IF v_max IS NULL THEN RETURN; END IF;

  -- Rétrograder les confirmés au-delà de la capacité
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

  -- Promouvoir depuis la liste d'attente s'il reste de la place
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

-- 3. Trigger : à chaque changement de max_participants, on réajuste
CREATE OR REPLACE FUNCTION public.trg_enforce_outing_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.max_participants IS DISTINCT FROM OLD.max_participants THEN
    PERFORM public.enforce_outing_capacity(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_outing_max_changed ON public.outings;
CREATE TRIGGER on_outing_max_changed
  AFTER UPDATE OF max_participants ON public.outings
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_outing_capacity();

-- 4. Correction unique des sorties existantes hors capacité
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.outings WHERE is_deleted = false LOOP
    PERFORM public.enforce_outing_capacity(r.id);
  END LOOP;
END $$;
