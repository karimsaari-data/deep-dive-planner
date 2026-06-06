-- Table de dimension : niveaux de progression (système poisson)
CREATE TABLE IF NOT EXISTS public.dim_niveau (
  niveau_id   SMALLINT PRIMARY KEY,
  nom         TEXT NOT NULL,
  seuil_min   SMALLINT NOT NULL,
  seuil_max   SMALLINT,
  couleur_hex TEXT,
  ordre       SMALLINT NOT NULL
);

INSERT INTO public.dim_niveau VALUES
  (0, 'Inactif',    0,  0,  '#D1D5DB', 1),
  (1, 'Castagnole', 1,  3,  '#60A5FA', 2),
  (2, 'Girelle',    4,  7,  '#22D3EE', 3),
  (3, 'Rouget',     8,  12, '#F97316', 4),
  (4, 'Poulpe',     13, 19, '#D946EF', 5),
  (5, 'Barracuda',  20, 29, '#EF4444', 6),
  (6, 'Mérou',      30, NULL, '#FBBF24', 7)
ON CONFLICT (niveau_id) DO NOTHING;

GRANT SELECT ON public.dim_niveau TO powerbi_reader;

CREATE TABLE IF NOT EXISTS public.fait_niveau_membre (
  membre_id        UUID PRIMARY KEY REFERENCES public.dim_membre(membre_id) ON DELETE CASCADE,
  nb_sorties_total SMALLINT NOT NULL DEFAULT 0,
  niveau_id        SMALLINT NOT NULL REFERENCES public.dim_niveau(niveau_id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fait_niveau_membre TO powerbi_reader;

CREATE OR REPLACE FUNCTION recalc_niveau_membre(p_membre_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_nb  SMALLINT;
  v_niv SMALLINT;
BEGIN
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
$$;

CREATE OR REPLACE FUNCTION trg_sync_niveau_from_participation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_niveau_membre(OLD.membre_id);
  ELSE
    PERFORM recalc_niveau_membre(NEW.membre_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_niveau_participation
  AFTER INSERT OR UPDATE OR DELETE ON public.fait_participation
  FOR EACH ROW EXECUTE FUNCTION trg_sync_niveau_from_participation();

CREATE OR REPLACE TRIGGER trg_niveau_participation_historique
  AFTER INSERT OR UPDATE OR DELETE ON public.fait_participation_historique
  FOR EACH ROW EXECUTE FUNCTION trg_sync_niveau_from_participation();

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT membre_id FROM (
      SELECT membre_id FROM public.fait_participation
      UNION
      SELECT membre_id FROM public.fait_participation_historique
    ) t
  LOOP
    PERFORM recalc_niveau_membre(r.membre_id);
  END LOOP;
END;
$$;