-- Ajout manuel d'un participant à une sortie (y compris passée) par un admin,
-- l'organisateur ou un co-encadrant. Contourne les RLS d'INSERT (user_id = auth.uid()).
CREATE OR REPLACE FUNCTION public.admin_add_participant(p_outing_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM outings o WHERE o.id = p_outing_id AND o.organizer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM outing_co_instructors ci WHERE ci.outing_id = p_outing_id AND ci.user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF EXISTS (SELECT 1 FROM reservations WHERE outing_id = p_outing_id AND user_id = p_user_id) THEN
    UPDATE reservations
       SET status = 'confirmé', cancelled_at = NULL
     WHERE outing_id = p_outing_id AND user_id = p_user_id;
  ELSE
    INSERT INTO reservations (outing_id, user_id, status)
    VALUES (p_outing_id, p_user_id, 'confirmé');
  END IF;

  -- Le trigger de capacité a pu rétrograder la réservation en liste d'attente
  SELECT status::text INTO v_status
    FROM reservations WHERE outing_id = p_outing_id AND user_id = p_user_id;
  RETURN v_status;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_add_participant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_add_participant(uuid, uuid) TO authenticated;
