-- Verrou de capacité au niveau base : à chaque inscription/réactivation en
-- 'confirmé', on réapplique enforce_outing_capacity (qui rétrograde le surplus
-- vers la liste d'attente). Évite tout dépassement quel que soit le chemin
-- (la vérification côté client ne suffit pas : cas de course possibles).
CREATE OR REPLACE FUNCTION public.trg_enforce_capacity_on_reservation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- Seuls les passages en 'confirmé' peuvent dépasser la capacité.
  -- Les passages en 'en_attente' (dont la rétrogradation faite par enforce)
  -- ne re-déclenchent pas enforce -> pas de récursion.
  IF NEW.status = 'confirmé' THEN
    PERFORM public.enforce_outing_capacity(NEW.outing_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_reservation_enforce_capacity ON public.reservations;
CREATE TRIGGER on_reservation_enforce_capacity
  AFTER INSERT OR UPDATE OF status ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_capacity_on_reservation();

-- Corriger l'état actuel de toutes les sorties
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.outings WHERE is_deleted = false LOOP
    PERFORM public.enforce_outing_capacity(r.id);
  END LOOP;
END $$;
