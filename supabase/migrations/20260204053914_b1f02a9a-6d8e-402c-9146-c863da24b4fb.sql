-- Update get_trombinoscope_members to use membership_yearly_status for seasonal data
CREATE OR REPLACE FUNCTION public.get_trombinoscope_members()
 RETURNS TABLE(id uuid, first_name text, last_name text, apnea_level text, board_role text, is_encadrant boolean, email text, avatar_url text)
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
    mys.apnea_level,
    mys.board_role,
    COALESCE(mys.is_encadrant, false),
    cmd.email,
    p.avatar_url
  FROM public.club_members_directory cmd
  LEFT JOIN public.profiles p ON lower(cmd.email) = lower(p.email)
  LEFT JOIN public.membership_yearly_status mys ON mys.member_id = cmd.id 
    AND mys.season_year = (SELECT year FROM current_season)
  ORDER BY cmd.last_name ASC;
$function$;

-- Update is_current_user_encadrant to check membership_yearly_status
CREATE OR REPLACE FUNCTION public.is_current_user_encadrant()
 RETURNS boolean
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
  SELECT COALESCE(
    (SELECT mys.is_encadrant 
     FROM public.club_members_directory cmd
     JOIN public.membership_yearly_status mys ON mys.member_id = cmd.id
       AND mys.season_year = (SELECT year FROM current_season)
     WHERE lower(cmd.email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
     LIMIT 1),
    false
  );
$function$;