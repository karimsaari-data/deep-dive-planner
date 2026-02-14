-- Add max participants supervision limit for instructors
ALTER TABLE public.apnea_levels
ADD COLUMN max_participants_encadrement INTEGER;

COMMENT ON COLUMN public.apnea_levels.max_participants_encadrement IS 'Nombre maximum de participants pouvant être encadrés';

-- Update existing data with max participants for instructors
-- FSGT EA2: 8 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 8
WHERE code = 'FSGT EA2';

-- FSGT EA1: 6 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 6
WHERE code = 'FSGT EA1';

-- FSGT EA3: 12 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 12
WHERE code = 'FSGT EA3';

-- FFESSM E1 (Initiateur): 8 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 8
WHERE code = 'FFESSM E1';

-- FFESSM E2 (Moniteur 1er degré): 10 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 10
WHERE code = 'FFESSM E2';

-- FFESSM E3 (Moniteur 2ème degré): 12 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 12
WHERE code = 'FFESSM E3';

-- FFESSM E4 (Instructeur national): 12 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 12
WHERE code = 'FFESSM E4';

-- BPJEPS: 10 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 10
WHERE code = 'BPJEPS';

-- DEJEPS: 12 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 12
WHERE code = 'DEJEPS';

-- DESJEPS: 12 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 12
WHERE code = 'DESJEPS';

-- AIDA Instructor: 10 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 10
WHERE code = 'AIDA Instructor';

-- AIDA Master: 12 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 12
WHERE code = 'AIDA Master';

-- Molchanovs Instructor: 10 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 10
WHERE code = 'MOL Instructor';

-- Molchanovs Advanced Instructor: 12 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 12
WHERE code = 'MOL Advanced Instructor';

-- Molchanovs Master Instructor: 12 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 12
WHERE code = 'MOL Master Instructor';

-- PADI Freediver Instructor: 8 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 8
WHERE code = 'PADI Freediver Instructor';

-- SSI instructors: 8-10 personnes max selon niveau
UPDATE public.apnea_levels
SET max_participants_encadrement = 8
WHERE code IN ('SSI AI', 'SSI OWI');

UPDATE public.apnea_levels
SET max_participants_encadrement = 10
WHERE code IN ('SSI AOWI', 'SSI Master Instructor', 'SSI Divemaster Instructor');

UPDATE public.apnea_levels
SET max_participants_encadrement = 12
WHERE code = 'SSI IT';

-- FSGT CT: 12 personnes max
UPDATE public.apnea_levels
SET max_participants_encadrement = 12
WHERE code = 'FSGT CT';
