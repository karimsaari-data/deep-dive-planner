-- Bloque la réservation de sorties pour les adhérents dont le dossier de la
-- saison en cours n'est pas complet (cotisation, certificat médical, charte
-- des palanquées, assurance FSGT). Les admins ne sont jamais bloqués.

CREATE OR REPLACE FUNCTION public.has_complete_season_dossier(_user_id UUID)
RETURNS BOOLEAN
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
    FROM public.club_members_directory cmd
    JOIN public.profiles p ON lower(p.email) = lower(cmd.email)
    JOIN public.membership_yearly_status mys ON mys.member_id = cmd.id
      AND mys.season_year = (SELECT year FROM current_season)
    WHERE p.id = _user_id
      AND mys.payment_status
      AND mys.medical_certificate_ok
      AND mys.buddies_charter_signed
      AND mys.fsgt_insurance_ok
  );
$$;

-- Nouvelle inscription : le membre doit avoir un dossier saison complet.
CREATE POLICY "Dossier saison requis pour réserver"
ON public.reservations
AS RESTRICTIVE
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR public.has_complete_season_dossier(auth.uid())
);

-- Réactivation d'une réservation annulée (passage à confirmé/en_attente) :
-- même exigence. N'affecte pas l'annulation, ni les updates faits par un
-- admin/organisateur sur la réservation d'un tiers.
CREATE POLICY "Dossier saison requis pour réactiver sa réservation"
ON public.reservations
AS RESTRICTIVE
FOR UPDATE
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() <> user_id
  OR status NOT IN ('confirmé', 'en_attente')
  OR public.has_complete_season_dossier(auth.uid())
);
