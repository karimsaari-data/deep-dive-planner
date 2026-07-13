-- Sécurise l'inscription aux sorties contre les désynchros DWH.
--
-- Contexte : quand un profil n'est pas rattaché à un membre de l'annuaire
-- (dim_membre.profile_id NULL — nouvel inscrit, faute de frappe sur l'email, etc.),
-- dwh_sync_fait_participation insérait une ligne fait_participation avec membre_id NULL.
-- Cela déclenchait recalc_niveau_membre(NULL) -> INSERT dans fait_niveau_membre avec
-- membre_id NULL -> violation NOT NULL -> échec de TOUTE la transaction, donc
-- l'inscription de l'utilisateur était bloquée par une simple synchro DWH.
--
-- Correctif : la synchro DWH devient best-effort. Si le membre n'est pas identifié,
-- on saute la synchro (RETURN) au lieu de faire échouer l'action utilisateur.

-- 1) Garde-fou en amont : on n'insère pas de participation sans membre identifié.
CREATE OR REPLACE FUNCTION public.dwh_sync_fait_participation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_membre_id uuid;
  v_site_id   uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM fait_participation
    WHERE sortie_id = OLD.outing_id
      AND membre_id IN (SELECT membre_id FROM dim_membre WHERE profile_id = OLD.user_id);
    RETURN OLD;
  END IF;

  SELECT dm.membre_id INTO v_membre_id
  FROM dim_membre dm WHERE dm.profile_id = NEW.user_id LIMIT 1;

  -- Garde-fou : profil non rattaché à un membre du DWH -> on ne synchronise pas,
  -- pour ne pas bloquer l'inscription de l'utilisateur. Synchro DWH best-effort.
  IF v_membre_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT ds.site_id INTO v_site_id
  FROM outings o
  JOIN dim_site ds ON ds.site_id = o.location_id
  WHERE o.id = NEW.outing_id LIMIT 1;

  INSERT INTO fait_participation (
    membre_id, sortie_id, date_id, bateau_id, site_id,
    titre_sortie, type_sortie, mode_plongee, capacite_max,
    heure_mise_eau, heure_sortie_eau,
    statut_reservation, option_covoiturage,
    present, absent, encadrant_principal, updated_at
  )
  SELECT
    v_membre_id, NEW.outing_id, o.date_time::date, o.boat_id, v_site_id,
    o.title, o.outing_type, o.dive_mode, o.max_participants,
    o.water_entry_time, o.water_exit_time,
    NEW.status::text, NEW.carpool_option,
    CASE WHEN COALESCE(NEW.is_present, false) THEN 1 ELSE 0 END,
    CASE WHEN NEW.status::text = 'annulé' THEN 1 ELSE 0 END,
    o.organizer_member_id::text, now()
  FROM outings o WHERE o.id = NEW.outing_id
  ON CONFLICT (membre_id, sortie_id) DO UPDATE SET
    statut_reservation = EXCLUDED.statut_reservation,
    option_covoiturage = EXCLUDED.option_covoiturage,
    present            = EXCLUDED.present,
    absent             = EXCLUDED.absent,
    bateau_id          = EXCLUDED.bateau_id,
    updated_at         = now();

  RETURN NEW;
END;
$function$;

-- 2) Défense en profondeur : recalc_niveau_membre ne fait rien si le membre est NULL.
CREATE OR REPLACE FUNCTION public.recalc_niveau_membre(p_membre_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_nb  SMALLINT;
  v_niv SMALLINT;
BEGIN
  -- Garde-fou : membre non identifié -> aucun niveau à recalculer.
  IF p_membre_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(nb), 0) INTO v_nb FROM (
    SELECT COUNT(DISTINCT sortie_id) AS nb
    FROM public.fait_participation
    WHERE membre_id = p_membre_id AND present = 1
    UNION ALL
    SELECT COUNT(DISTINCT sortie_id) AS nb
    FROM public.fait_participation_historique
    WHERE membre_id = p_membre_id
  ) s;

  SELECT niveau_id INTO v_niv
  FROM public.dim_niveau
  WHERE v_nb >= seuil_min
  ORDER BY seuil_min DESC
  LIMIT 1;

  INSERT INTO public.fait_niveau_membre (membre_id, nb_sorties_total, niveau_id, updated_at)
  VALUES (p_membre_id, v_nb, v_niv, now())
  ON CONFLICT (membre_id) DO UPDATE
    SET nb_sorties_total = v_nb,
        niveau_id        = v_niv,
        updated_at       = now();
END;
$function$;
