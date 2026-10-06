-- Paliers resserrés : 4 sorties maximum pour passer au niveau suivant
-- 0 | 1-3 | 4-7 | 8-11 | 12-15 | 16-19 | 20+
UPDATE public.dim_niveau SET seuil_min = 0,  seuil_max = 0    WHERE niveau_id = 0;
UPDATE public.dim_niveau SET seuil_min = 1,  seuil_max = 3    WHERE niveau_id = 1;
UPDATE public.dim_niveau SET seuil_min = 4,  seuil_max = 7    WHERE niveau_id = 2;
UPDATE public.dim_niveau SET seuil_min = 8,  seuil_max = 11   WHERE niveau_id = 3;
UPDATE public.dim_niveau SET seuil_min = 12, seuil_max = 15   WHERE niveau_id = 4;
UPDATE public.dim_niveau SET seuil_min = 16, seuil_max = 19   WHERE niveau_id = 5;
UPDATE public.dim_niveau SET seuil_min = 20, seuil_max = NULL WHERE niveau_id = 6;

-- Recalcul du niveau de chaque membre avec les nouveaux seuils
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT membre_id FROM public.fait_niveau_membre LOOP
    PERFORM recalc_niveau_membre(r.membre_id);
  END LOOP;
END $$;
