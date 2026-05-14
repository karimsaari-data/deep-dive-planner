-- Fix: inliner la logique dans le trigger
-- Évite appel SECURITY DEFINER imbriqué (PERFORM d'une fonction SECURITY DEFINER
-- depuis une autre SECURITY DEFINER ne garantissait pas le bon contexte de privilèges)
CREATE OR REPLACE FUNCTION public.trg_recalculate_outing_max_participants()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_outing_id uuid;
  v_season_year integer;
  v_total integer := 0;
  v_organizer_id uuid;
BEGIN
  v_outing_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.outing_id ELSE NEW.outing_id END;

  v_season_year := CASE
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 9
    THEN EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1
    ELSE EXTRACT(YEAR FROM CURRENT_DATE)::integer
  END;

  SELECT organizer_id INTO v_organizer_id FROM public.outings WHERE id = v_outing_id;
  IF v_organizer_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT COALESCE(SUM(al.max_participants_encadrement), 0) INTO v_total
  FROM (
    SELECT p.email FROM public.profiles p WHERE p.id = v_organizer_id
    UNION ALL
    SELECT p.email FROM public.outing_co_instructors oci
    JOIN public.profiles p ON p.id = oci.user_id
    WHERE oci.outing_id = v_outing_id
  ) instructors
  JOIN public.club_members_directory cmd ON lower(cmd.email) = lower(instructors.email)
  JOIN public.membership_yearly_status mys
    ON mys.member_id = cmd.id AND mys.season_year = v_season_year
  JOIN public.apnea_levels al ON al.code = mys.apnea_level
  WHERE al.max_participants_encadrement IS NOT NULL;

  IF v_total > 0 THEN
    UPDATE public.outings SET max_participants = v_total WHERE id = v_outing_id;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
