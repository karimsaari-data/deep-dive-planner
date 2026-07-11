-- Palanquées : affectation des inscrits à un groupe en amont de la sortie.
-- Modèle minimal : une simple colonne group_number (nullable) sur reservations.
-- NULL = non affecté. 1, 2, 3... = numéro de palanquée.

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS group_number integer;

-- RPC d'affectation. L'UPDATE direct sur reservations est réservé par RLS à
-- l'organisateur/admin ; cette fonction SECURITY DEFINER élargit le droit
-- d'écrire UNIQUEMENT la colonne group_number à l'organisateur, à ses
-- co-encadrants et aux admins.
CREATE OR REPLACE FUNCTION public.set_reservation_group(
  p_reservation_id uuid,
  p_group_number integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_outing_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT outing_id INTO v_outing_id
  FROM public.reservations
  WHERE id = p_reservation_id;

  IF v_outing_id IS NULL THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1 FROM public.outings
      WHERE id = v_outing_id AND organizer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.outing_co_instructors
      WHERE outing_id = v_outing_id AND user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.reservations
  SET group_number = p_group_number
  WHERE id = p_reservation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_reservation_group(uuid, integer) TO authenticated;

-- Expose group_number dans la liste des participants (utilisée par la vue
-- « Mes Réservations » pour que chaque inscrit voie sa palanquée).
DROP FUNCTION IF EXISTS public.get_outing_participants(uuid);
CREATE FUNCTION public.get_outing_participants(outing_uuid uuid)
RETURNS TABLE(id uuid, first_name text, last_name text, avatar_url text, member_status text, status text, created_at timestamptz, group_number integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.first_name, p.last_name, p.avatar_url, p.member_status::text,
         r.status::text, r.created_at, r.group_number
  FROM public.reservations r
  JOIN public.profiles p ON r.user_id = p.id
  WHERE r.outing_id = outing_uuid
    AND r.status IN ('confirmé', 'en_attente')
  ORDER BY
    CASE WHEN r.status = 'confirmé' THEN 0 ELSE 1 END,
    CASE WHEN p.member_status = 'Encadrant' THEN 0 ELSE 1 END,
    r.created_at;
$$;
