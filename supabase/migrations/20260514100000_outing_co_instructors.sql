-- Table pour les co-encadrants de sorties
CREATE TABLE public.outing_co_instructors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outing_id UUID NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (outing_id, user_id)
);

ALTER TABLE public.outing_co_instructors ENABLE ROW LEVEL SECURITY;

-- Tout le monde (authentifié) peut voir les co-encadrants
CREATE POLICY "co_instructors_select"
  ON public.outing_co_instructors FOR SELECT
  USING (true);

-- L'organisateur de la sortie ou un admin peut ajouter des co-encadrants
CREATE POLICY "co_instructors_insert"
  ON public.outing_co_instructors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.outings
      WHERE id = outing_id AND organizer_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- L'organisateur, le co-encadrant lui-même ou un admin peut supprimer
CREATE POLICY "co_instructors_delete"
  ON public.outing_co_instructors FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.outings
      WHERE id = outing_id AND organizer_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );
