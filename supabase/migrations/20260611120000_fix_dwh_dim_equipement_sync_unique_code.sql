-- Fix DWH sync: dim_equipement.unique_code et date_acquisition n'étaient pas
-- alimentés par le trigger trg_dwh_equipment_inventory, ce qui laissait ces
-- colonnes à NULL pour tout matériel créé via l'app (visible dans Power BI).

CREATE OR REPLACE FUNCTION public.dwh_sync_dim_equipement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO dim_equipement (
    inventory_id, nom, description, valeur_estimee, statut,
    unique_code, date_acquisition
  )
  SELECT
    NEW.id, ec.name, ec.description, ec.estimated_value, NEW.status::text,
    NEW.unique_code, NEW.acquired_at
  FROM equipment_catalog ec
  WHERE ec.id = NEW.catalog_id
  ON CONFLICT (inventory_id) DO UPDATE SET
    statut           = EXCLUDED.statut,
    unique_code      = EXCLUDED.unique_code,
    date_acquisition = EXCLUDED.date_acquisition,
    updated_at       = now();
  RETURN NEW;
END;
$function$;

-- Backfill des lignes existantes laissées avec NULL par l'ancienne version.
UPDATE dim_equipement d
SET unique_code      = ei.unique_code,
    date_acquisition = ei.acquired_at,
    updated_at       = now()
FROM equipment_inventory ei
WHERE d.inventory_id = ei.id
  AND (d.unique_code IS NULL OR d.date_acquisition IS NULL);
