-- Create admin-only RPC function for club statistics
CREATE OR REPLACE FUNCTION public.get_club_stats(p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      SELECT COUNT(*) FROM outings 
      WHERE date_time >= start_of_year AND date_time <= end_of_year
    ),
    'avgOccupation', (
      SELECT COALESCE(ROUND(AVG(
        CASE WHEN o.max_participants > 0 THEN
          (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé')::numeric 
          / o.max_participants * 100
        ELSE 0 END
      )), 0)
      FROM outings o
      WHERE o.date_time >= start_of_year AND o.date_time <= end_of_year
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
        SELECT COUNT(*) as cnt FROM reservations r
        JOIN outings o ON r.outing_id = o.id
        WHERE o.date_time >= start_of_year AND o.date_time <= end_of_year
        AND r.status = 'confirmé'
        GROUP BY o.id
      ) sub
    ),
    'typeData', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT outing_type as name, COUNT(*) as value
        FROM outings
        WHERE date_time >= start_of_year AND date_time <= end_of_year
        GROUP BY outing_type
        ORDER BY COUNT(*) DESC
      ) t
    ),
    'monthlyData', (
      SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.month_num), '[]'::json)
      FROM (
        SELECT 
          to_char(date_time, 'Mon') as name,
          EXTRACT(MONTH FROM date_time) as month_num,
          COUNT(*) as sorties
        FROM outings
        WHERE date_time >= start_of_year AND date_time <= end_of_year
        GROUP BY to_char(date_time, 'Mon'), EXTRACT(MONTH FROM date_time)
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
        WHERE o.date_time >= start_of_year AND o.date_time <= end_of_year
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
          (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé') as inscrits,
          (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé' AND is_present = true) as "présents"
        FROM outings o
        WHERE o.date_time < NOW()
          AND o.date_time >= start_of_year AND o.date_time <= end_of_year
          AND (SELECT COUNT(*) FROM reservations WHERE outing_id = o.id AND status = 'confirmé' AND is_present = true) >= 2
        ORDER BY o.date_time DESC
        LIMIT 10
      ) pc
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute to authenticated users (function handles its own authorization)
GRANT EXECUTE ON FUNCTION public.get_club_stats(INTEGER) TO authenticated;

-- Add database CHECK constraints for input validation
-- Outings table constraints
ALTER TABLE public.outings
  ADD CONSTRAINT check_title_length 
    CHECK (char_length(TRIM(title)) >= 3 AND char_length(title) <= 100),
  ADD CONSTRAINT check_description_length 
    CHECK (description IS NULL OR char_length(description) <= 500),
  ADD CONSTRAINT check_location_length 
    CHECK (char_length(TRIM(location)) >= 3 AND char_length(location) <= 200),
  ADD CONSTRAINT check_max_participants_range 
    CHECK (max_participants >= 1 AND max_participants <= 100);

-- Profiles table constraints  
ALTER TABLE public.profiles
  ADD CONSTRAINT check_first_name_length
    CHECK (char_length(TRIM(first_name)) >= 1 AND char_length(first_name) <= 50),
  ADD CONSTRAINT check_last_name_length
    CHECK (char_length(TRIM(last_name)) >= 1 AND char_length(last_name) <= 50),
  ADD CONSTRAINT check_apnea_level_length
    CHECK (apnea_level IS NULL OR char_length(apnea_level) <= 100),
  ADD CONSTRAINT check_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Reservations table constraints
ALTER TABLE public.reservations
  ADD CONSTRAINT check_carpool_seats_range
    CHECK (carpool_seats IS NULL OR (carpool_seats >= 0 AND carpool_seats <= 10));

-- Locations table constraints
ALTER TABLE public.locations
  ADD CONSTRAINT check_location_name_length
    CHECK (char_length(TRIM(name)) >= 2 AND char_length(name) <= 100),
  ADD CONSTRAINT check_max_depth_range
    CHECK (max_depth IS NULL OR (max_depth >= 0 AND max_depth <= 500));