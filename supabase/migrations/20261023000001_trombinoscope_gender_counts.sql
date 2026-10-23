-- Répartition femmes / hommes des adhérents de la saison en cours (trombinoscope)
-- Nouveau RPC dédié : évite DROP/CREATE de get_trombinoscope_members
CREATE OR REPLACE FUNCTION public.get_trombinoscope_gender_counts()
 RETURNS TABLE(femmes integer, hommes integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH current_season AS (
    SELECT CASE
      WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 9
      THEN EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1
      ELSE EXTRACT(YEAR FROM CURRENT_DATE)::integer
    END as year
  )
  SELECT
    COUNT(*) FILTER (WHERE cmd.gender = 'Femme')::integer,
    COUNT(*) FILTER (WHERE cmd.gender = 'Homme')::integer
  FROM public.club_members_directory cmd
  INNER JOIN public.membership_yearly_status mys ON mys.member_id = cmd.id
    AND mys.season_year = (SELECT year FROM current_season);
$function$;

GRANT EXECUTE ON FUNCTION public.get_trombinoscope_gender_counts() TO authenticated;
