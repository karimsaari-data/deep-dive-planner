-- Critère "licence OK" : fichier uploadé ET date de validité non dépassée (saison en cours).
-- 1. get_users_license_status : has_license repose sur ce critère.
-- 2. get_trombinoscope_license_ok : indicateur par adhérent (n'expose pas le fichier).
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
    COALESCE(
      mys.license_document_path IS NOT NULL
      AND mys.license_expiry_date IS NOT NULL
      AND mys.license_expiry_date >= CURRENT_DATE,
      false
    ) AS has_license
  FROM public.profiles p
  LEFT JOIN public.club_members_directory cmd ON lower(cmd.email) = lower(p.email)
  LEFT JOIN public.membership_yearly_status mys ON mys.member_id = cmd.id
    AND mys.season_year = (SELECT year FROM current_season)
  WHERE p.id = ANY(p_user_ids);
$function$;

CREATE OR REPLACE FUNCTION public.get_trombinoscope_license_ok()
 RETURNS TABLE(member_id uuid, license_ok boolean)
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
    mys.member_id,
    COALESCE(
      mys.license_document_path IS NOT NULL
      AND mys.license_expiry_date IS NOT NULL
      AND mys.license_expiry_date >= CURRENT_DATE,
      false
    ) AS license_ok
  FROM public.membership_yearly_status mys
  WHERE mys.season_year = (SELECT year FROM current_season);
$function$;

REVOKE ALL ON FUNCTION public.get_trombinoscope_license_ok() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trombinoscope_license_ok() TO authenticated;
