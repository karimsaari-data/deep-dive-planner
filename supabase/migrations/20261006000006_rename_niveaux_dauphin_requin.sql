-- Niveau 5 (20-29 sorties) -> Dauphin ; niveau 6 (30+) -> Requin (aligné sur l'application)
UPDATE public.dim_niveau SET nom = 'Dauphin' WHERE niveau_id = 5;
UPDATE public.dim_niveau SET nom = 'Requin'  WHERE niveau_id = 6;
