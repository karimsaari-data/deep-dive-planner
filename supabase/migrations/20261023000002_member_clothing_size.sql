-- Taille vestimentaire (lycras, t-shirts, commandes groupées), saisie par l'adhérent sur son profil
ALTER TABLE public.club_members_directory
  ADD COLUMN IF NOT EXISTS clothing_size text;
