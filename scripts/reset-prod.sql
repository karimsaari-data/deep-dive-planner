-- ============================================================
-- SCRIPT DE PASSAGE EN PRODUCTION - Team Oxygen / MyOxygen
-- ============================================================
-- À exécuter dans Supabase Dashboard → SQL Editor
-- avant l'ouverture officielle de l'app.
--
-- Ce script supprime toutes les sorties de test et leurs données
-- liées (réservations, covoit, historique participants) en cascade,
-- en conservant les sorties archivées.
-- ============================================================


-- ÉTAPE 1 : APERÇU
-- Vérifie ce qui sera supprimé avant de lancer le DELETE.

SELECT id, title, date_time, is_archived
FROM outings
WHERE is_archived = false OR is_archived IS NULL
ORDER BY date_time DESC;


-- ÉTAPE 2 : SUPPRESSION
-- Efface toutes les sorties non archivées et leurs données liées en cascade
-- (réservations, covoit, historique participants).

DELETE FROM outings
WHERE is_archived = false OR is_archived IS NULL;


-- ÉTAPE 3 : VÉRIFICATION
-- Doit afficher 0 pour sorties, reservations, carpools, historique.

SELECT
  (SELECT COUNT(*) FROM outings WHERE is_archived = false OR is_archived IS NULL) AS sorties_restantes,
  (SELECT COUNT(*) FROM reservations) AS reservations,
  (SELECT COUNT(*) FROM carpools) AS carpools,
  (SELECT COUNT(*) FROM historical_outing_participants) AS historique;
