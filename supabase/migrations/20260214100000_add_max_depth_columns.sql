-- Add max depth columns for instructor supervision limits
-- EAA = Eau Artificielle (piscine/fosse)
-- EAO = Eau Ouverte (mer/lac)

ALTER TABLE public.apnea_levels
ADD COLUMN profondeur_max_eaa INTEGER,
ADD COLUMN profondeur_max_eao INTEGER;

COMMENT ON COLUMN public.apnea_levels.profondeur_max_eaa IS 'Profondeur maximale d''encadrement en Eau Artificielle (piscine/fosse) en mètres';
COMMENT ON COLUMN public.apnea_levels.profondeur_max_eao IS 'Profondeur maximale d''encadrement en Eau Ouverte (mer/lac) en mètres';

-- Update existing data with max depths for instructors
-- FSGT EA2: 15m en mer, 20m en fosse
UPDATE public.apnea_levels
SET profondeur_max_eaa = 20, profondeur_max_eao = 15
WHERE code = 'FSGT EA2';

-- FSGT EA1: 10m en mer, 12m en fosse
UPDATE public.apnea_levels
SET profondeur_max_eaa = 12, profondeur_max_eao = 10
WHERE code = 'FSGT EA1';

-- FSGT EA3: 40m en mer et fosse
UPDATE public.apnea_levels
SET profondeur_max_eaa = 40, profondeur_max_eao = 40
WHERE code = 'FSGT EA3';

-- FFESSM E1 (Initiateur): 10m en mer et fosse
UPDATE public.apnea_levels
SET profondeur_max_eaa = 10, profondeur_max_eao = 10
WHERE code = 'FFESSM E1';

-- FFESSM E2 (Moniteur 1er degré): 20m en mer et fosse
UPDATE public.apnea_levels
SET profondeur_max_eaa = 20, profondeur_max_eao = 20
WHERE code = 'FFESSM E2';

-- FFESSM E3 (Moniteur 2ème degré): 40m en mer et fosse
UPDATE public.apnea_levels
SET profondeur_max_eaa = 40, profondeur_max_eao = 40
WHERE code = 'FFESSM E3';

-- FFESSM E4 (Instructeur national): 40m en mer et fosse
UPDATE public.apnea_levels
SET profondeur_max_eaa = 40, profondeur_max_eao = 40
WHERE code = 'FFESSM E4';

-- BPJEPS: 30m en mer et fosse
UPDATE public.apnea_levels
SET profondeur_max_eaa = 30, profondeur_max_eao = 30
WHERE code = 'BPJEPS';

-- DEJEPS: 40m en mer et fosse
UPDATE public.apnea_levels
SET profondeur_max_eaa = 40, profondeur_max_eao = 40
WHERE code = 'DEJEPS';

-- DESJEPS: 40m en mer et fosse
UPDATE public.apnea_levels
SET profondeur_max_eaa = 40, profondeur_max_eao = 40
WHERE code = 'DESJEPS';

-- AIDA Instructor: 30m en mer et fosse
UPDATE public.apnea_levels
SET profondeur_max_eaa = 30, profondeur_max_eao = 30
WHERE code = 'AIDA Instructor';

-- AIDA Master: 40m en mer et fosse
UPDATE public.apnea_levels
SET profondeur_max_eaa = 40, profondeur_max_eao = 40
WHERE code = 'AIDA Master';

-- Molchanovs Instructor: 30m en mer et fosse
UPDATE public.apnea_levels
SET profondeur_max_eaa = 30, profondeur_max_eao = 30
WHERE code = 'MOL Instructor';

-- Molchanovs Advanced Instructor: 40m en mer et fosse
UPDATE public.apnea_levels
SET profondeur_max_eaa = 40, profondeur_max_eao = 40
WHERE code = 'MOL Advanced Instructor';

-- Molchanovs Master Instructor: 40m en mer et fosse
UPDATE public.apnea_levels
SET profondeur_max_eaa = 40, profondeur_max_eao = 40
WHERE code = 'MOL Master Instructor';

-- PADI Freediver Instructor: 24m en mer et fosse (max Advanced Freediver)
UPDATE public.apnea_levels
SET profondeur_max_eaa = 24, profondeur_max_eao = 24
WHERE code = 'PADI Freediver Instructor';

-- SSI instructors
UPDATE public.apnea_levels
SET profondeur_max_eaa = 30, profondeur_max_eao = 30
WHERE code IN ('SSI AI', 'SSI OWI', 'SSI AOWI');

UPDATE public.apnea_levels
SET profondeur_max_eaa = 40, profondeur_max_eao = 40
WHERE code IN ('SSI Master Instructor', 'SSI Divemaster Instructor', 'SSI IT');

-- FSGT CT: 40m en mer et fosse
UPDATE public.apnea_levels
SET profondeur_max_eaa = 40, profondeur_max_eao = 40
WHERE code = 'FSGT CT';
