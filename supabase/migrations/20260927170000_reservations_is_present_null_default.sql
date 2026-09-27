-- is_present défaut à false = impossible de distinguer "pointage jamais fait" de "pointé absent".
-- Passe le défaut à NULL (= non pointé) pour permettre à l'UI de bloquer la clôture d'une sortie
-- tant que l'appel n'a pas été fait sur tous les confirmés.
ALTER TABLE reservations ALTER COLUMN is_present SET DEFAULT NULL;

-- Réinitialise à NULL les réservations confirmées des sorties passées où AUCUN confirmé n'a
-- jamais été pointé présent (signature d'un pointage jamais réalisé, pas d'une vraie absence).
UPDATE reservations r
SET is_present = NULL
WHERE r.status = 'confirmé'
  AND r.is_present = false
  AND r.outing_id IN (
    SELECT r2.outing_id
    FROM reservations r2
    JOIN outings o ON o.id = r2.outing_id
    WHERE r2.status = 'confirmé'
      AND o.is_deleted = false
      AND o.date_time < now()
    GROUP BY r2.outing_id
    HAVING count(*) FILTER (WHERE r2.is_present = false) = count(*)
  );
