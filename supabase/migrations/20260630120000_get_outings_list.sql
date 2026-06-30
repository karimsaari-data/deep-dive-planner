-- RPC: list every outing of a given year with date, name, type and participant count.
-- Powers the "Sorties" tab of the club statistics page.
-- Mirrors get_club_stats: admin-only, SECURITY DEFINER, and counts participants
-- from both regular reservations (présents) and historical_outing_participants.
CREATE OR REPLACE FUNCTION public.get_outings_list(p_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
  start_of_year TIMESTAMPTZ;
  end_of_year TIMESTAMPTZ;
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  start_of_year := make_timestamptz(p_year, 1, 1, 0, 0, 0);
  end_of_year := make_timestamptz(p_year, 12, 31, 23, 59, 59);

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date_time DESC), '[]'::json)
  INTO result
  FROM (
    SELECT
      o.id,
      o.title,
      o.date_time,
      o.end_date,
      o.outing_type,
      o.max_participants,
      (o.date_time < NOW()) AS is_past,
      -- Participant count:
      --   past outings    -> people who actually attended (présents) or historical participants
      --   future outings  -> confirmed registrations (inscrits) or historical participants
      CASE WHEN o.date_time < NOW() THEN
        GREATEST(
          (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true),
          (SELECT COUNT(*) FROM historical_outing_participants hop WHERE hop.outing_id = o.id)
        )
      ELSE
        GREATEST(
          (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé'),
          (SELECT COUNT(*) FROM historical_outing_participants hop WHERE hop.outing_id = o.id)
        )
      END AS participant_count
    FROM outings o
    WHERE o.date_time >= start_of_year
      AND o.date_time <= end_of_year
      AND o.is_deleted = false
  ) t;

  RETURN result;
END;
$function$;
