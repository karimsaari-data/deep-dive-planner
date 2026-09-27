-- Archivage d'un adhérent qui arrête, au lieu de la suppression physique
-- de sa fiche (qui faisait perdre tout l'historique cotisations/licences
-- via le cascade sur membership_yearly_status).
ALTER TABLE public.club_members_directory
ADD COLUMN IF NOT EXISTS departure_date DATE;
