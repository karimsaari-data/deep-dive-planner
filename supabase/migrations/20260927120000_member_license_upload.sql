-- Licence FSGT/FFESSM par saison : upload par l'adhérent depuis son profil,
-- avec numéro et date de validité affichés dans l'admin (liste adhérents).

-- 1. Colonnes licence sur membership_yearly_status (une licence par saison)
ALTER TABLE public.membership_yearly_status
ADD COLUMN IF NOT EXISTS license_expiry_date DATE,
ADD COLUMN IF NOT EXISTS license_document_path TEXT,
ADD COLUMN IF NOT EXISTS license_uploaded_at TIMESTAMP WITH TIME ZONE;

-- 2. Lecture de sa propre ligne (nécessaire pour afficher la licence sur le profil ;
-- la table reste réservée en écriture directe aux admins, l'upsert ciblé passe par la RPC ci-dessous)
CREATE POLICY "Members can view own membership status"
ON public.membership_yearly_status
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.club_members_directory cmd
    JOIN public.profiles p ON lower(p.email) = lower(cmd.email)
    WHERE cmd.id = membership_yearly_status.member_id
      AND p.id = auth.uid()
  )
);

-- 3. RPC pour que l'adhérent mette à jour uniquement ses champs licence
-- (jamais payment_status / medical_certificate_ok / etc., qui restent admin-only)
CREATE OR REPLACE FUNCTION public.upsert_own_license(
  p_season_year INTEGER,
  p_license_number TEXT,
  p_license_expiry_date DATE,
  p_license_document_path TEXT
)
RETURNS public.membership_yearly_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_result public.membership_yearly_status;
BEGIN
  SELECT cmd.id INTO v_member_id
  FROM public.club_members_directory cmd
  JOIN public.profiles p ON lower(p.email) = lower(cmd.email)
  WHERE p.id = auth.uid();

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Aucune fiche adhérent associée à ce compte';
  END IF;

  INSERT INTO public.membership_yearly_status (
    member_id, season_year, license_number, license_expiry_date,
    license_document_path, license_uploaded_at
  )
  VALUES (
    v_member_id, p_season_year, p_license_number, p_license_expiry_date,
    p_license_document_path, now()
  )
  ON CONFLICT (member_id, season_year)
  DO UPDATE SET
    license_number = EXCLUDED.license_number,
    license_expiry_date = EXCLUDED.license_expiry_date,
    license_document_path = EXCLUDED.license_document_path,
    license_uploaded_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_own_license(INTEGER, TEXT, DATE, TEXT) TO authenticated;

-- 4. Bucket privé pour les fichiers de licence, chemin <member_id>/<season_year>/<fichier>
INSERT INTO storage.buckets (id, name, public)
VALUES ('licenses', 'licenses', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Members can manage own license files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'licenses' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.club_members_directory cmd
      JOIN public.profiles p ON lower(p.email) = lower(cmd.email)
      WHERE cmd.id::text = (storage.foldername(name))[1]
        AND p.id = auth.uid()
    )
  )
)
WITH CHECK (
  bucket_id = 'licenses' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.club_members_directory cmd
      JOIN public.profiles p ON lower(p.email) = lower(cmd.email)
      WHERE cmd.id::text = (storage.foldername(name))[1]
        AND p.id = auth.uid()
    )
  )
);
