-- Niveau d'apnée par saison : l'adhérent choisit son niveau et uploade sa carte
-- depuis son profil. La carte est conservée (bucket privé "licenses") pour contrôle admin.

ALTER TABLE public.membership_yearly_status
ADD COLUMN IF NOT EXISTS level_card_path TEXT,
ADD COLUMN IF NOT EXISTS level_card_uploaded_at TIMESTAMP WITH TIME ZONE;

-- RPC : l'adhérent ne met à jour que son niveau + sa carte (jamais payment_status, is_encadrant, etc.)
CREATE OR REPLACE FUNCTION public.upsert_own_apnea_level(
  p_season_year INTEGER,
  p_apnea_level TEXT,
  p_level_card_path TEXT
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

  IF NOT EXISTS (SELECT 1 FROM public.apnea_levels WHERE code = p_apnea_level) THEN
    RAISE EXCEPTION 'Niveau d''apnée inconnu';
  END IF;

  -- Le chemin doit pointer vers le dossier de l'adhérent
  IF p_level_card_path IS NULL OR split_part(p_level_card_path, '/', 1) <> v_member_id::text THEN
    RAISE EXCEPTION 'Chemin de carte invalide';
  END IF;

  INSERT INTO public.membership_yearly_status (
    member_id, season_year, apnea_level, level_card_path, level_card_uploaded_at
  )
  VALUES (v_member_id, p_season_year, p_apnea_level, p_level_card_path, now())
  ON CONFLICT (member_id, season_year)
  DO UPDATE SET
    apnea_level = EXCLUDED.apnea_level,
    level_card_path = EXCLUDED.level_card_path,
    level_card_uploaded_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_own_apnea_level(INTEGER, TEXT, TEXT) TO authenticated;
