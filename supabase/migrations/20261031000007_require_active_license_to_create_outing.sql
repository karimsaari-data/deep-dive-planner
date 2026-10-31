-- Création de sortie : l'encadrant doit avoir une licence active (fichier uploadé +
-- date de validité non dépassée, saison en cours). Les admins ne sont jamais bloqués.
-- Trigger (et non policy) car la création passe par la RPC create_outing_with_organizer.
CREATE OR REPLACE FUNCTION public.enforce_active_license_for_outing_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hors session utilisateur (SQL direct, service) : pas de contrôle
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NOT public.has_active_license(auth.uid()) THEN
    RAISE EXCEPTION 'Votre licence n''est pas active (fichier non déposé ou date de validité dépassée) : déposez-la depuis votre profil, rubrique « Ma licence », pour pouvoir créer une sortie.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_require_active_license_outing
BEFORE INSERT ON public.outings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_active_license_for_outing_creation();
