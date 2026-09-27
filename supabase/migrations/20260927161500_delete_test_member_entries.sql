-- Suppression de 2 fiches de test créées pendant le développement
-- (aucune donnée de saison, aucun compte application associé).
ALTER TABLE public.club_members_directory DISABLE TRIGGER trg_dwh_cmd;

DELETE FROM public.club_members_directory
WHERE id IN (
  'f7981eb1-4d6a-45f8-9919-1fe9b3d613fe', -- "Karim test SAARI" / karimsaari.com@gmail.com
  'a104758c-ea75-4022-9ff1-102dd4153c5a'  -- "Karim TEST" / darkmassilia@gmail.com
);

ALTER TABLE public.club_members_directory ENABLE TRIGGER trg_dwh_cmd;
