-- RPC: liste détaillée des sorties encadrées par chaque encadrant pour une année.
-- Compagnon de get_encadrant_monthly_stats : mêmes règles (sortie valide >= 2
-- participants, rôle organisateur OU co-encadrant, sorties passées uniquement),
-- afin que le détail affiché soit cohérent avec les totaux mensuels.
-- Admin-only, SECURITY DEFINER. Tri par date décroissante (plus récent d'abord).
CREATE OR REPLACE FUNCTION public.get_encadrant_outings_detail(p_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer)
RETURNS TABLE (
  profile_id UUID,
  outing_id UUID,
  title TEXT,
  date_time TIMESTAMPTZ,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  WITH valid_outings AS (
    SELECT o.id, o.organizer_id, o.title, o.date_time
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
  encadrant_outings AS (
    SELECT vo.organizer_id AS profile_id, vo.id AS outing_id, vo.title, vo.date_time, 'organizer'::TEXT AS role
    FROM valid_outings vo
    UNION ALL
    SELECT ci.user_id AS profile_id, vo.id AS outing_id, vo.title, vo.date_time, 'co_instructor'::TEXT AS role
    FROM valid_outings vo
    JOIN outing_co_instructors ci ON ci.outing_id = vo.id
    WHERE ci.user_id <> vo.organizer_id
  )
  SELECT eo.profile_id, eo.outing_id, eo.title, eo.date_time, eo.role
  FROM encadrant_outings eo
  JOIN profiles p ON p.id = eo.profile_id
  WHERE p.member_status = 'Encadrant'
  ORDER BY eo.date_time DESC;
END;
$$;
