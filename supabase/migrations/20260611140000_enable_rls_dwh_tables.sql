-- Sécurisation DWH : active Row Level Security sur les tables dim_* / fait_* / calendrier.
-- Sans policy pour anon/authenticated, ces tables ne sont plus accessibles via l'API REST
-- avec la clé publique (elles étaient lisibles ET modifiables par n'importe qui).
-- Power BI (rôle powerbi_reader) garde un accès lecture via une policy dédiée.

-- 1. Toutes les fonctions de sync DWH passent en SECURITY DEFINER.
--    Sinon, une fois RLS activé, leurs écritures dans les tables dim_*/fait_* seraient
--    bloquées quand le trigger est déclenché par un utilisateur de l'app (rôle authenticated).
--    SECURITY DEFINER les fait tourner en tant que postgres (propriétaire → bypass RLS).
DO $$
DECLARE fn regprocedure;
BEGIN
  FOR fn IN
    SELECT DISTINCT t.tgfoid::regprocedure
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal
      AND (t.tgname LIKE 'trg\_dwh%' OR t.tgname LIKE 'trg\_niveau%')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER SET search_path = public', fn);
  END LOOP;
END $$;

-- Appelée par trg_sync_niveau_from_participation (et potentiellement hors trigger).
ALTER FUNCTION public.recalc_niveau_membre(uuid) SECURITY DEFINER SET search_path = public;

-- 2. Activer RLS sur les 21 tables DWH / référentiel.
ALTER TABLE IF EXISTS public.calendrier                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dim_saison                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dim_membre                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dim_site                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dim_equipement                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dim_sondage                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dim_waypoint                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dim_role                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dim_options_sondage           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dim_compte                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dim_niveau                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fait_participation            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fait_participation_historique ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fait_adhesion                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fait_mouvement_equipement     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fait_vote                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fait_covoiturage              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fait_passager_covoiturage     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fait_co_instructeur           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fait_encadrant                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fait_niveau_membre            ENABLE ROW LEVEL SECURITY;

-- 3. Power BI : accès lecture explicite pour le rôle powerbi_reader.
DO $$
DECLARE tbl text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'powerbi_reader') THEN
    RAISE NOTICE 'Rôle powerbi_reader absent — policies non créées';
    RETURN;
  END IF;
  FOREACH tbl IN ARRAY ARRAY[
    'calendrier','dim_saison','dim_membre','dim_site','dim_equipement',
    'dim_sondage','dim_waypoint','dim_role','dim_options_sondage','dim_compte',
    'dim_niveau','fait_participation','fait_participation_historique',
    'fait_adhesion','fait_mouvement_equipement','fait_vote','fait_covoiturage',
    'fait_passager_covoiturage','fait_co_instructeur','fait_encadrant',
    'fait_niveau_membre'
  ]
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT ON public.%I TO powerbi_reader', tbl);
      EXECUTE format('DROP POLICY IF EXISTS powerbi_reader_select ON public.%I', tbl);
      EXECUTE format(
        'CREATE POLICY powerbi_reader_select ON public.%I FOR SELECT TO powerbi_reader USING (true)',
        tbl
      );
    END IF;
  END LOOP;
END $$;
