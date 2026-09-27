-- Rattrapage historique : adhérents dont la dernière saison active connue
-- est 2024/2025 (season_year=2025), sans renouvellement depuis (2 saisons
-- manquées : 2025/2026 et 2026/2027) et sans date de départ déjà posée.
-- Date de départ = fin de leur dernière saison réellement active (31/08/2025).
-- Aucun d'eux n'a de compte application (vérifié avant migration).
UPDATE public.club_members_directory
SET departure_date = '2025-08-31'
WHERE id IN (
  '19ffb7e6-abbb-4d13-bc88-3158d7c8706b', -- Joris AMABILE
  '40aa0f9e-cf86-4be3-9c01-2406b8ce1022', -- Lionel AMADEO
  'f6e9b3de-1ae1-444b-b5af-55aa6b0c6b04', -- Pierre ARNAUD DROUHIN
  '42a097ae-d779-49cf-8e8d-a4353ed34d31', -- Alexandre BENDEROUICH
  'f24d5bc6-6155-45fa-9bd7-a805b445efd9', -- Damien CARRIERE
  'aeb5660b-7e5f-403a-b72a-f60ec1726e06', -- Valerie CHAINTRON
  '6db38515-70a5-4e50-bd32-0073dd47417a', -- Samuel CHARREIRAT
  'aecc8719-d250-4bed-afdf-61514e563fa6', -- Emilien CORBET
  '3b8aaa46-fae5-434c-8fa5-83a5e6d4122c', -- Benoit CORNIL SANTUCCI
  '4fe91c6a-0427-453b-a012-a24a6e328ae2', -- Baptiste COUSSEAU
  'dfdc0ad1-871b-419a-b1c6-b4065a469610', -- Gabin COUSTY
  '3d0212ce-daad-4a1c-b276-83f324cf6a5b', -- Paul HERINCX
  'b13671b8-262f-447a-994c-9c4ac758f790', -- Nathalie ISKANDAR
  'c459cab5-f2e9-4f43-bf08-ae4412010e2d', -- Océane LABOUDIE
  'f6b50697-3179-4df0-ab18-f08181ed8206', -- Julie LECLER
  '021e4d0f-da53-4207-a3f3-25751689a2c6', -- Victor LEIBOVICI
  '405052f7-dcd8-4937-9fc6-0f9442c10c35', -- Fabien MARTIN
  '4f4a5442-ae01-4414-9efd-db64f5215081', -- Youssra MECHRI
  'd7a62240-00f2-4420-a3d5-589f2d3dc370', -- Ingrid MEUCCI
  'f672c000-f6ad-4f50-9417-98c974cc8768', -- Joris NAIMA
  '555ba9f4-e0e0-4d5b-8121-19d908d8f09a', -- Caroline RAGUSA
  '6f5fb3b7-9e4d-4c7e-9a2f-3f3f56ea147d', -- Yvan RIVERO MARTIN
  'd1e6d22b-b14f-47bc-9a7e-cc23c85ce829', -- Nicolas ROMAN
  'e8bd2b66-e961-4aba-953a-4d91bdd2736d', -- David SALERNO
  'eacd6a03-f85b-4bc0-9ed9-7e00b5a23cab'  -- Han SUAH
);
