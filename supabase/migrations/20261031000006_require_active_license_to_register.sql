-- Inscription aux sorties : licence active obligatoire (fichier uploadé + date de validité
-- non dépassée, saison en cours). Les admins ne sont jamais bloqués. Les inscriptions
-- existantes ne sont pas affectées (seuls INSERT et réactivation d'une inscription annulée).

CREATE OR REPLACE FUNCTION public.has_active_license(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_season AS (
    SELECT CASE
      WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 9
      THEN EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1
      ELSE EXTRACT(YEAR FROM CURRENT_DATE)::integer
    END AS year
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.club_members_directory cmd ON lower(cmd.email) = lower(p.email)
    JOIN public.membership_yearly_status mys ON mys.member_id = cmd.id
      AND mys.season_year = (SELECT year FROM current_season)
    WHERE p.id = _user_id
      AND mys.license_document_path IS NOT NULL
      AND mys.license_expiry_date IS NOT NULL
      AND mys.license_expiry_date >= CURRENT_DATE
  );
$$;

REVOKE ALL ON FUNCTION public.has_active_license(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_license(uuid) TO authenticated;

CREATE POLICY "Licence active requise pour réserver"
ON public.reservations
AS RESTRICTIVE
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR public.has_active_license(auth.uid())
);

CREATE POLICY "Licence active requise pour réactiver sa réservation"
ON public.reservations
AS RESTRICTIVE
FOR UPDATE
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() <> user_id
  OR status NOT IN ('confirmé', 'en_attente')
  OR public.has_active_license(auth.uid())
);
