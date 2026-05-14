-- Fonction recalculant max_participants d'une sortie
-- = somme des max_participants_encadrement de l'organisateur + co-encadrants
-- Source des niveaux : membership_yearly_status (saison courante)
CREATE OR REPLACE FUNCTION public.recalculate_outing_max_participants(p_outing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_season_year integer;
  v_total integer := 0;
  v_organizer_id uuid;
BEGIN
  v_season_year := CASE
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 9
    THEN EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1
    ELSE EXTRACT(YEAR FROM CURRENT_DATE)::integer
  END;

  SELECT organizer_id INTO v_organizer_id FROM public.outings WHERE id = p_outing_id;
  IF v_organizer_id IS NULL THEN RETURN; END IF;

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

-- Trigger function
CREATE OR REPLACE FUNCTION public.trg_recalculate_outing_max_participants()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_outing_max_participants(OLD.outing_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalculate_outing_max_participants(NEW.outing_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_max_participants ON public.outing_co_instructors;
CREATE TRIGGER trg_recalculate_max_participants
  AFTER INSERT OR DELETE ON public.outing_co_instructors
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalculate_outing_max_participants();
