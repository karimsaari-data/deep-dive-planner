-- Update get_club_stats function to include historical outings in all statistics
CREATE OR REPLACE FUNCTION public.get_club_stats(p_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer)
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

  SELECT json_build_object(
    'totalOutings', (
      -- Count past outings with either:
      -- 1. At least 2 present participants (regular outings)
      -- 2. OR has historical participants (historical outings)
      SELECT COUNT(*) FROM outings o
      WHERE o.date_time >= start_of_year 
        AND o.date_time <= end_of_year
        AND o.date_time < NOW()
        AND (
          (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true) >= 2
          OR EXISTS (SELECT 1 FROM historical_outing_participants hop WHERE hop.outing_id = o.id)
        )
    ),
    'avgOccupation', (
      SELECT COALESCE(ROUND(AVG(
        CASE WHEN o.max_participants > 0 THEN
          GREATEST(
            (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé' AND is_present = true)::numeric,
            (SELECT COUNT(*) FROM historical_outing_participants WHERE outing_id = o.id)::numeric
          ) / o.max_participants * 100
        ELSE 0 END
      )), 0)
      FROM outings o
      WHERE o.date_time >= start_of_year 
        AND o.date_time <= end_of_year
        AND o.date_time < NOW()
        AND (
          (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true) >= 2
          OR EXISTS (SELECT 1 FROM historical_outing_participants hop WHERE hop.outing_id = o.id)
        )
    ),
    'presenceRate', (
      SELECT COALESCE(ROUND(
        (SELECT COUNT(*) FROM reservations r 
         JOIN outings o ON r.outing_id = o.id 
         WHERE o.date_time < NOW() AND r.status = 'confirmé' AND r.is_present = true
         AND o.date_time >= start_of_year AND o.date_time <= end_of_year
         AND (SELECT COUNT(*) FROM reservations r2 WHERE r2.outing_id = o.id AND r2.status = 'confirmé' AND r2.is_present = true) >= 2
        )::numeric /
        NULLIF((SELECT COUNT(*) FROM reservations r 
                JOIN outings o ON r.outing_id = o.id 
                WHERE o.date_time < NOW() AND r.status = 'confirmé' 
                AND o.date_time >= start_of_year AND o.date_time <= end_of_year
                AND (SELECT COUNT(*) FROM reservations r2 WHERE r2.outing_id = o.id AND r2.status = 'confirmé' AND r2.is_present = true) >= 2
               ), 0) * 100
      ), 0)
    ),
    'totalParticipants', (
      SELECT COALESCE(SUM(cnt), 0) FROM (
        -- Regular outing participants
        SELECT COUNT(*) as cnt FROM reservations r
        JOIN outings o ON r.outing_id = o.id
        WHERE o.date_time >= start_of_year 
          AND o.date_time <= end_of_year
          AND o.date_time < NOW()
          AND r.status = 'confirmé'
          AND r.is_present = true
          AND (SELECT COUNT(*) FROM reservations r2 WHERE r2.outing_id = o.id AND r2.status = 'confirmé' AND r2.is_present = true) >= 2
          AND NOT EXISTS (SELECT 1 FROM historical_outing_participants hop WHERE hop.outing_id = o.id)
        GROUP BY o.id
        UNION ALL
        -- Historical outing participants
        SELECT COUNT(*) as cnt FROM historical_outing_participants hop
        JOIN outings o ON hop.outing_id = o.id
        WHERE o.date_time >= start_of_year 
          AND o.date_time <= end_of_year
          AND o.date_time < NOW()
        GROUP BY o.id
      ) sub
    ),
    'typeData', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT o.outing_type as name, COUNT(*) as value
        FROM outings o
        WHERE o.date_time >= start_of_year 
          AND o.date_time <= end_of_year
          AND o.date_time < NOW()
          AND (
            (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true) >= 2
            OR EXISTS (SELECT 1 FROM historical_outing_participants hop WHERE hop.outing_id = o.id)
          )
        GROUP BY o.outing_type
        ORDER BY COUNT(*) DESC
      ) t
    ),
    'monthlyData', (
      SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.month_num), '[]'::json)
      FROM (
        SELECT 
          to_char(o.date_time, 'Mon') as name,
          EXTRACT(MONTH FROM o.date_time) as month_num,
          COUNT(*) as sorties
        FROM outings o
        WHERE o.date_time >= start_of_year 
          AND o.date_time <= end_of_year
          AND o.date_time < NOW()
          AND (
            (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true) >= 2
            OR EXISTS (SELECT 1 FROM historical_outing_participants hop WHERE hop.outing_id = o.id)
          )
        GROUP BY to_char(o.date_time, 'Mon'), EXTRACT(MONTH FROM o.date_time)
      ) m
    ),
    'organizerData', (
      SELECT COALESCE(json_agg(row_to_json(org)), '[]'::json)
      FROM (
        SELECT 
          p.first_name || ' ' || p.last_name as name,
          COUNT(*) as count
        FROM outings o
        JOIN profiles p ON o.organizer_id = p.id
        WHERE o.date_time >= start_of_year 
          AND o.date_time <= end_of_year
          AND o.date_time < NOW()
          AND (
            (SELECT COUNT(*) FROM reservations r WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true) >= 2
            OR EXISTS (SELECT 1 FROM historical_outing_participants hop WHERE hop.outing_id = o.id)
          )
        GROUP BY p.first_name, p.last_name
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) org
    ),
    'lateCancellationData', (
      SELECT COALESCE(json_agg(row_to_json(lc)), '[]'::json)
      FROM (
        SELECT 
          p.first_name || ' ' || p.last_name as name,
          COUNT(*) as count,
          r.user_id as "userId"
        FROM reservations r
        JOIN outings o ON r.outing_id = o.id
        JOIN profiles p ON r.user_id = p.id
        WHERE r.status = 'annulé'
          AND r.cancelled_at IS NOT NULL
          AND EXTRACT(EPOCH FROM (o.date_time - r.cancelled_at)) / 3600 < 24
          AND EXTRACT(EPOCH FROM (o.date_time - r.cancelled_at)) / 3600 >= 0
          AND o.date_time >= start_of_year AND o.date_time <= end_of_year
        GROUP BY r.user_id, p.first_name, p.last_name
        HAVING COUNT(*) >= 3
        ORDER BY COUNT(*) DESC
      ) lc
    ),
    'presenceComparisonData', (
      SELECT COALESCE(json_agg(row_to_json(pc)), '[]'::json)
      FROM (
        SELECT 
          CASE WHEN length(o.title) > 15 THEN substring(o.title from 1 for 15) || '...' ELSE o.title END as name,
          GREATEST(
            (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé'),
            (SELECT COUNT(*) FROM historical_outing_participants WHERE outing_id = o.id)
          ) as inscrits,
          GREATEST(
            (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé' AND is_present = true),
            (SELECT COUNT(*) FROM historical_outing_participants WHERE outing_id = o.id)
          ) as "présents"
        FROM outings o
        WHERE o.date_time < NOW()
          AND o.date_time >= start_of_year AND o.date_time <= end_of_year
          AND (
            (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé' AND is_present = true) >= 2
            OR EXISTS (SELECT 1 FROM historical_outing_participants hop WHERE hop.outing_id = o.id)
          )
        ORDER BY o.date_time DESC
        LIMIT 10
      ) pc
    )
  ) INTO result;

  RETURN result;
END;
$function$;