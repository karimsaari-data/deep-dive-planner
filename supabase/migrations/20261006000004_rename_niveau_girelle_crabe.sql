-- Niveau 2 renommé Girelle -> Crabe (aligné sur l'application)
UPDATE public.dim_niveau SET nom = 'Crabe' WHERE niveau_id = 2 AND nom = 'Girelle';
