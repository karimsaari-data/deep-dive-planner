-- Create confirmed reservations for co-instructors who don't already have one
INSERT INTO public.reservations (outing_id, user_id, status)
SELECT ci.outing_id, ci.user_id, 'confirmé'
FROM public.outing_co_instructors ci
WHERE NOT EXISTS (
  SELECT 1 FROM public.reservations r
  WHERE r.outing_id = ci.outing_id
    AND r.user_id = ci.user_id
    AND r.status != 'annulé'
);
