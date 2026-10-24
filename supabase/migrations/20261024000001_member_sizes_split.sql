-- Tailles séparées : t-shirt, lycra, pointure de palmes (remplace clothing_size)
ALTER TABLE public.club_members_directory
  ADD COLUMN IF NOT EXISTS tshirt_size text,
  ADD COLUMN IF NOT EXISTS lycra_size text,
  ADD COLUMN IF NOT EXISTS fin_size text;

-- Reprise de la taille unique existante pour ne rien perdre
UPDATE public.club_members_directory
SET tshirt_size = COALESCE(tshirt_size, clothing_size),
    lycra_size = COALESCE(lycra_size, clothing_size)
WHERE clothing_size IS NOT NULL;

ALTER TABLE public.club_members_directory
  DROP COLUMN IF EXISTS clothing_size;
