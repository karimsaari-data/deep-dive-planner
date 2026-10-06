-- Niveau 3 renommé Rouget -> Méduse (aligné sur l'application)
UPDATE public.dim_niveau SET nom = 'Méduse' WHERE niveau_id = 3 AND nom = 'Rouget';
