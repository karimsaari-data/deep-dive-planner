-- Niveau 5 renommé Barracuda -> Murène (aligné sur l'application)
UPDATE public.dim_niveau SET nom = 'Murène' WHERE niveau_id = 5 AND nom = 'Barracuda';
