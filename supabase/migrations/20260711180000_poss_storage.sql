-- POSS accessible depuis l'appli : on persiste le PDF généré dans un bucket
-- Storage privé et on garde une référence + un horodatage sur la sortie, afin
-- que tout participant inscrit puisse le consulter sans le régénérer.

-- 1. Références sur la sortie
ALTER TABLE public.outings
  ADD COLUMN IF NOT EXISTS poss_path TEXT,
  ADD COLUMN IF NOT EXISTS poss_generated_at TIMESTAMPTZ;

-- 2. Bucket privé dédié aux POSS (données perso : contacts d'urgence, niveaux)
INSERT INTO storage.buckets (id, name, public)
VALUES ('poss', 'poss', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Politiques Storage
-- Chemin de stockage : "<outing_id>/poss.pdf" -> le 1er segment est l'outing_id.

-- Lecture : encadrement/admin OU participant confirmé de la sortie.
CREATE POLICY "Participants and staff can view POSS"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'poss'
  AND (
    public.is_encadrant_or_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.outing_id = ((storage.foldername(name))[1])::uuid
        AND r.user_id = auth.uid()
        AND r.status = 'confirmé'
    )
  )
);

-- Écriture (upload, upsert, suppression) : réservée aux admins/organisateurs,
-- même périmètre que l'UPDATE de la table outings (où l'on écrit poss_path).
CREATE POLICY "Staff can upload POSS"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'poss'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'organizer')
  )
);

CREATE POLICY "Staff can update POSS"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'poss'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'organizer')
  )
);

CREATE POLICY "Staff can delete POSS"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'poss'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'organizer')
  )
);
