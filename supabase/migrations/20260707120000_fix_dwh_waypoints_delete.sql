-- Fix DWH sync: trg_dwh_waypoints se déclenche aussi sur DELETE, mais la fonction
-- faisait toujours un INSERT avec NEW.id (NULL sur DELETE), ce qui violait la
-- contrainte NOT NULL de dim_waypoint.waypoint_id et empêchait toute suppression
-- de point d'intérêt (parking, entrée/sortie, etc.) sur les lieux de plongée.

CREATE OR REPLACE FUNCTION public.dwh_sync_dim_waypoint()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM dim_waypoint WHERE waypoint_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO dim_waypoint (waypoint_id, site_id, nom, latitude, longitude, type_point)
  VALUES (NEW.id, NEW.site_id, NEW.name, NEW.latitude, NEW.longitude, NEW.point_type::text)
  ON CONFLICT (waypoint_id) DO UPDATE SET
    nom = EXCLUDED.nom, latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude, type_point = EXCLUDED.type_point,
    updated_at = now();
  RETURN NEW;
END;
$function$;
