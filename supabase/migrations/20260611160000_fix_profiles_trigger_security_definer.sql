-- Fix: toutes les fonctions trigger de la table profiles passent en SECURITY DEFINER.
-- La migration 20260611140000 ne ciblait que les triggers nommés 'trg_dwh%'.
-- Si la fonction de sync profiles→dim_compte a un nom différent, elle était silencieusement
-- ignorée et continuait à s'exécuter avec le rôle authenticated (bloqué par RLS sur dim_compte).
DO $$
DECLARE fn regprocedure;
BEGIN
  FOR fn IN
    SELECT DISTINCT t.tgfoid::regprocedure
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'profiles'
      AND NOT t.tgisinternal
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SECURITY DEFINER SET search_path = public',
      fn
    );
  END LOOP;
END $$;
