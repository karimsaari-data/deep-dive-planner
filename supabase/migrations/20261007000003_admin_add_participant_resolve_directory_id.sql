-- Fix : le sélecteur « Ajouter un participant » (OutingDetail) envoie un id de
-- club_members_directory (get_trombinoscope_members.id), alors que
-- reservations.user_id référence profiles.id (0 id en commun). On résout donc par email.
CREATE OR REPLACE FUNCTION public.admin_add_participant(p_outing_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
  v_user_id uuid;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM outings o WHERE o.id = p_outing_id AND o.organizer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM outing_co_instructors ci WHERE ci.outing_id = p_outing_id AND ci.user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT p.id INTO v_user_id FROM profiles p WHERE p.id = p_user_id;
  IF v_user_id IS NULL THEN
    SELECT p.id INTO v_user_id
    FROM club_members_directory cmd
    JOIN profiles p ON lower(p.email) = lower(cmd.email)
    WHERE cmd.id = p_user_id;
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Ce membre n''a pas de compte dans l''application';
  END IF;

  IF EXISTS (SELECT 1 FROM reservations WHERE outing_id = p_outing_id AND user_id = v_user_id) THEN
    UPDATE reservations
       SET status = 'confirmé', cancelled_at = NULL
     WHERE outing_id = p_outing_id AND user_id = v_user_id;
  ELSE
    INSERT INTO reservations (outing_id, user_id, status)
    VALUES (p_outing_id, v_user_id, 'confirmé');
  END IF;

  SELECT status::text INTO v_status
    FROM reservations WHERE outing_id = p_outing_id AND user_id = v_user_id;
  RETURN v_status;
END;
$$;
