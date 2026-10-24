-- Fix : la suppression d'un sondage échouait (NEW non défini sur DELETE dans le trigger DWH)
CREATE OR REPLACE FUNCTION public.dwh_sync_dim_sondage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM dim_sondage WHERE sondage_id = OLD.id;
    RETURN OLD;
  END IF;
  INSERT INTO dim_sondage (sondage_id, titre, choix_multiple, est_actif, cree_par, date_creation, date_cloture)
  VALUES (NEW.id, NEW.title, NEW.allow_multiple, NEW.is_active, NEW.created_by,
          NEW.created_at::date, NEW.closes_at::date)
  ON CONFLICT (sondage_id) DO UPDATE SET
    titre = EXCLUDED.titre, est_actif = EXCLUDED.est_actif,
    date_cloture = EXCLUDED.date_cloture, updated_at = now();
  RETURN NEW;
END;
$$;
