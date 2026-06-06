-- RPC function: stats mensuelles par encadrant (organisateur + co-encadrant)
-- Retourne pour chaque encadrant le nombre de sorties par mois pour une année donnée
CREATE OR REPLACE FUNCTION get_encadrant_monthly_stats(p_year INTEGER)
RETURNS TABLE (
  profile_id UUID,
  encadrant_name TEXT,
  month_index INTEGER,
  outing_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Sorties valides : au moins 2 participants (reservations présents ou historical_outing_participants)
  WITH valid_outings AS (
    SELECT o.id, o.organizer_id, o.date_time
    FROM outings o
    WHERE EXTRACT(YEAR FROM o.date_time) = p_year
      AND o.date_time < NOW()
      AND o.organizer_id IS NOT NULL
      AND (
        (SELECT COUNT(*) FROM reservations r
          WHERE r.outing_id = o.id AND r.status = 'confirmé' AND r.is_present = true)
        +
        (SELECT COUNT(*) FROM historical_outing_participants h WHERE h.outing_id = o.id)
      ) >= 2
  ),
  -- Combinaison organisateur + co-encadrant
  encadrant_outings AS (
    SELECT vo.organizer_id AS profile_id, vo.date_time FROM valid_outings vo
    UNION ALL
    SELECT ci.user_id AS profile_id, vo.date_time
    FROM valid_outings vo
    JOIN outing_co_instructors ci ON ci.outing_id = vo.id
    WHERE ci.user_id <> vo.organizer_id
  )
  SELECT
    p.id AS profile_id,
    p.first_name || ' ' || p.last_name AS encadrant_name,
    EXTRACT(MONTH FROM eo.date_time)::INTEGER - 1 AS month_index,
    COUNT(*) AS outing_count
  FROM profiles p
  JOIN encadrant_outings eo ON eo.profile_id = p.id
  WHERE p.member_status = 'Encadrant'
  GROUP BY p.id, p.first_name, p.last_name, month_index
  ORDER BY encadrant_name, month_index;
$$;
