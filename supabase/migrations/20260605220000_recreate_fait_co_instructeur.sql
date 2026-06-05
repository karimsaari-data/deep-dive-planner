-- Recréation de fait_co_instructeur pour correspondre au trigger dwh_sync_fait_co_instructeur
-- L'ancienne table avait des colonnes incompatibles (co_instructeur_id, nb_co_instructeurs, updated_at)

DROP TABLE IF EXISTS public.fait_co_instructeur CASCADE;

CREATE TABLE public.fait_co_instructeur (
  sortie_id    UUID NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
  membre_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_id      DATE,
  is_cloturee  BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (sortie_id, membre_id)
);

GRANT SELECT ON public.fait_co_instructeur TO powerbi_reader;

-- Trigger de synchronisation
CREATE OR REPLACE FUNCTION dwh_sync_fait_co_instructeur()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM fait_co_instructeur
    WHERE sortie_id = OLD.outing_id AND membre_id = OLD.user_id;
    RETURN OLD;
  END IF;

  INSERT INTO fait_co_instructeur (sortie_id, membre_id, date_id, is_cloturee, created_at)
  SELECT NEW.outing_id, NEW.user_id, o.date_id, (o.date_time < NOW()), now()
  FROM outings o
  WHERE o.id = NEW.outing_id
  ON CONFLICT (sortie_id, membre_id) DO UPDATE
    SET date_id     = EXCLUDED.date_id,
        is_cloturee = EXCLUDED.is_cloturee;

  RETURN NEW;
END;
$$;

-- Backfill depuis les données existantes
INSERT INTO public.fait_co_instructeur (sortie_id, membre_id, date_id, is_cloturee, created_at)
SELECT ci.outing_id, ci.user_id, o.date_id, (o.date_time < NOW()), ci.added_at
FROM public.outing_co_instructors ci
JOIN public.outings o ON o.id = ci.outing_id
ON CONFLICT (sortie_id, membre_id) DO NOTHING;

-- Réactiver le trigger (désactivé car table était cassée)
ALTER TABLE public.outing_co_instructors ENABLE TRIGGER trg_dwh_co_instructeurs;
