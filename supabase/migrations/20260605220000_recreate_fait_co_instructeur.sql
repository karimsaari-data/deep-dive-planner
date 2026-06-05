-- Recréation de fait_co_instructeur pour correspondre au trigger dwh_sync_fait_co_instructeur
-- L'ancienne table avait des colonnes incompatibles (co_instructeur_id, nb_co_instructeurs, updated_at)

DROP TABLE IF EXISTS public.fait_co_instructeur CASCADE;

CREATE TABLE public.fait_co_instructeur (
  sortie_id   UUID NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
  membre_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_id     DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (sortie_id, membre_id)
);

-- Backfill depuis les données existantes
INSERT INTO public.fait_co_instructeur (sortie_id, membre_id, date_id, created_at)
SELECT ci.outing_id, ci.user_id, o.date_id, ci.added_at
FROM public.outing_co_instructors ci
JOIN public.outings o ON o.id = ci.outing_id
ON CONFLICT (sortie_id, membre_id) DO NOTHING;

-- Réactiver le trigger (désactivé car table était cassée)
ALTER TABLE public.outing_co_instructors ENABLE TRIGGER trg_dwh_co_instructeurs;
