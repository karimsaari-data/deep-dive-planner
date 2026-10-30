-- Indique, pour une liste d'utilisateurs, si un numéro de licence est saisi
-- pour la saison en cours. N'expose pas le numéro lui-même.
CREATE OR REPLACE FUNCTION public.get_users_license_status(p_user_ids uuid[])
 RETURNS TABLE(user_id uuid, has_license boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH current_season AS (
    SELECT CASE
      WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 9
      THEN EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1
      ELSE EXTRACT(YEAR FROM CURRENT_DATE)::integer
    END AS year
  )
  SELECT
    p.id AS user_id,
    COALESCE(NULLIF(BTRIM(mys.license_number), '') IS NOT NULL, false) AS has_license
  FROM public.profiles p
  LEFT JOIN public.club_members_directory cmd ON lower(cmd.email) = lower(p.email)
  LEFT JOIN public.membership_yearly_status mys ON mys.member_id = cmd.id
    AND mys.season_year = (SELECT year FROM current_season)
  WHERE p.id = ANY(p_user_ids);
$function$;

REVOKE ALL ON FUNCTION public.get_users_license_status(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_users_license_status(uuid[]) TO authenticated;
