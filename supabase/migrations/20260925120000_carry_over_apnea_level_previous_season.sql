-- Carry over a member's apnea_level from the most recent previous season
-- when the current season's membership_yearly_status row has no level set
-- yet (level doesn't need to be re-entered every season, unlike payment,
-- medical certificate, charter and insurance which genuinely expire yearly).
CREATE OR REPLACE FUNCTION public.get_trombinoscope_members()
 RETURNS TABLE(id uuid, first_name text, last_name text, apnea_level text, board_role text, is_encadrant boolean, email text, phone text, avatar_url text)
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
    cmd.id,
    cmd.first_name,
    cmd.last_name,
    COALESCE(
      mys.apnea_level,
      (
        SELECT mys_prev.apnea_level
        FROM public.membership_yearly_status mys_prev
        WHERE mys_prev.member_id = cmd.id
          AND mys_prev.apnea_level IS NOT NULL
          AND mys_prev.season_year < (SELECT year FROM current_season)
        ORDER BY mys_prev.season_year DESC
        LIMIT 1
      )
    ) AS apnea_level,
    mys.board_role,
    COALESCE(mys.is_encadrant, false),
    cmd.email,
    cmd.phone,
    p.avatar_url
  FROM public.club_members_directory cmd
  LEFT JOIN public.profiles p ON lower(cmd.email) = lower(p.email)
  INNER JOIN public.membership_yearly_status mys ON mys.member_id = cmd.id
    AND mys.season_year = (SELECT year FROM current_season)
  ORDER BY cmd.last_name ASC;
$function$;
