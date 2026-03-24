-- Trigger: quand un nouveau profil est créé, synchroniser member_status
-- depuis membership_yearly_status si la personne est encadrante

CREATE OR REPLACE FUNCTION public.sync_member_status_on_profile_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_encadrant boolean;
BEGIN
  -- Chercher si cette adresse email est marquée encadrante dans la saison courante
  SELECT COALESCE(mys.is_encadrant, false) INTO v_is_encadrant
  FROM club_members_directory cmd
  JOIN membership_yearly_status mys ON mys.member_id = cmd.id
  WHERE lower(cmd.email) = lower(NEW.email)
    AND mys.season_year = (
      CASE WHEN EXTRACT(MONTH FROM now()) >= 9
        THEN EXTRACT(YEAR FROM now())::int + 1
        ELSE EXTRACT(YEAR FROM now())::int
      END
    )
  LIMIT 1;

  -- Si encadrant, mettre à jour member_status
  IF v_is_encadrant THEN
    NEW.member_status := 'Encadrant';
  END IF;

  RETURN NEW;
END;
$$;

-- Attacher le trigger sur INSERT dans profiles
DROP TRIGGER IF EXISTS trg_sync_member_status_on_insert ON public.profiles;
CREATE TRIGGER trg_sync_member_status_on_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_member_status_on_profile_insert();
