-- Niveau 6 renommé Mérou -> Dauphin (aligné sur l'application)
UPDATE public.dim_niveau SET nom = 'Dauphin' WHERE niveau_id = 6 AND nom = 'Mérou';
