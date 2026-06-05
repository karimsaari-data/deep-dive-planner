-- Table DWH : sorties organisées par encadrant
CREATE TABLE public.fait_encadrant (
  sortie_id   UUID NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
  membre_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_id     DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (sortie_id, membre_id)
);

GRANT SELECT ON public.fait_encadrant TO powerbi_reader;

-- Trigger de synchronisation
CREATE OR REPLACE FUNCTION dwh_sync_fait_encadrant()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM fait_encadrant
    WHERE sortie_id = OLD.id AND membre_id = OLD.organizer_id;
    RETURN OLD;
  END IF;

  IF NEW.organizer_id IS NOT NULL THEN
    INSERT INTO fait_encadrant (sortie_id, membre_id, date_id, created_at)
    VALUES (NEW.id, NEW.organizer_id, NEW.date_id, now())
    ON CONFLICT (sortie_id, membre_id) DO UPDATE
      SET membre_id = NEW.organizer_id,
          date_id   = NEW.date_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dwh_encadrant
  AFTER INSERT OR UPDATE OR DELETE ON public.outings
  FOR EACH ROW EXECUTE FUNCTION dwh_sync_fait_encadrant();

-- Backfill depuis les données existantes
INSERT INTO public.fait_encadrant (sortie_id, membre_id, date_id, created_at)
SELECT o.id, o.organizer_id, o.date_id, o.created_at
FROM public.outings o
WHERE o.organizer_id IS NOT NULL
ON CONFLICT (sortie_id, membre_id) DO NOTHING;
