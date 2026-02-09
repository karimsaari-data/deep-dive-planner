-- Create reference table for apnea certification levels
CREATE TABLE public.apnea_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  prerogatives TEXT,
  is_instructor BOOLEAN DEFAULT false,
  federation TEXT,
  federation_full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.apnea_levels ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated users can read apnea_levels"
  ON public.apnea_levels FOR SELECT TO authenticated USING (true);

-- Insert all official apnea levels
INSERT INTO public.apnea_levels (code, name, prerogatives, is_instructor, federation, federation_full_name) VALUES
-- AIDA
('AIDA 1', 'AIDA 1', 'Introduction (piscine)', false, 'AIDA', 'Association Internationale pour le Développement de l''Apnée'),
('AIDA 2', 'AIDA 2', '-16m / 40m dynamique', false, 'AIDA', 'Association Internationale pour le Développement de l''Apnée'),
('AIDA 3', 'AIDA 3', '-30m / 60m dynamique', false, 'AIDA', 'Association Internationale pour le Développement de l''Apnée'),
('AIDA 4', 'AIDA 4', '-40m / 80m dynamique', false, 'AIDA', 'Association Internationale pour le Développement de l''Apnée'),
('AIDA Instructor', 'AIDA Instructor', 'AIDA 1 à 3- Enseignement international- Délivrance certifications AIDA', true, 'AIDA', 'Association Internationale pour le Développement de l''Apnée'),
('AIDA Master', 'Master', 'Formation instructeur', false, 'AIDA', 'Association Internationale pour le Développement de l''Apnée'),

-- Diplômes d'État
('BPJEPS', 'BPJEPS', 'Apnée variable- Initiation découverte- Apprentissage -20/-30m- Encadrement rémunéré légal', true, 'Diplôme d''État', 'Diplôme d''État Supérieur de la Jeunesse, de l''Éducation Populaire et du Sport'),
('DEJEPS', 'DEJEPS Plongée + Apnée', 'Encadrement -40m- Coordination équipes- Direction structure- Formation cadres', true, 'Diplôme d''État', 'Diplôme d''État Supérieur de la Jeunesse, de l''Éducation Populaire et du Sport'),
('DESJEPS', 'DESJEPS', 'Direction structures complexes- Formation formateurs- Expertise nationale', true, 'Diplôme d''État', 'Diplôme d''État Supérieur de la Jeunesse, de l''Éducation Populaire et du Sport'),

-- CMAS
('CMAS 1', 'CMAS Apnea Diver (1 étoile)', '-10m', false, 'CMAS', 'Confédération Mondiale des Activités Subaquatiques'),
('CMAS 2', 'CMAS 2', '-20m', false, 'CMAS', 'Confédération Mondiale des Activités Subaquatiques'),
('CMAS 3', 'CMAS 3', '-30m', false, 'CMAS', 'Confédération Mondiale des Activités Subaquatiques'),
('CMAS 4', 'CMAS 4', '-40m', false, 'CMAS', 'Confédération Mondiale des Activités Subaquatiques'),

-- FFESSM
('FFESSM A1', 'FFESSM Apnée 1', '-10m', false, 'FFESSM', 'Fédération Française d''Études et de Sports Sous-Marins'),
('FFESSM A2', 'FFESSM Apnée 2', '-20m', false, 'FFESSM', 'Fédération Française d''Études et de Sports Sous-Marins'),
('FFESSM A3', 'FFESSM Apnée 3', '-30m', false, 'FFESSM', 'Fédération Française d''Études et de Sports Sous-Marins'),
('FFESSM A4', 'FFESSM Apnée 4', '-40m', false, 'FFESSM', 'Fédération Française d''Études et de Sports Sous-Marins'),
('FFESSM A5', 'FFESSM Apnée 5', '-50m+', false, 'FFESSM', 'Fédération Française d''Études et de Sports Sous-Marins'),
('FFESSM AEEL', 'FFESSM AEEL', '-20m', false, 'FFESSM', 'Fédération Française d''Études et de Sports Sous-Marins'),
('FFESSM E1', 'E1 (Initiateur)', 'Baptêmes découverte- Apnée 1 en autonomie- Assistance Apnée 2 (sous tutorat E2+)', true, 'FFESSM', 'Fédération Française d''Études et de Sports Sous-Marins'),
('FFESSM E2', 'E2 (Moniteur 1er degré)', 'Apnée 1 et 2 en autonomie- Préparation Apnée 3- Formation E1 (sous tutorat E3)', true, 'FFESSM', 'Fédération Française d''Études et de Sports Sous-Marins'),
('FFESSM E3', 'E3 (Moniteur 2ème degré)', 'Tous niveaux Apnée (1 à 5)- Formation E1 et E2- Responsabilité pédagogique club', true, 'FFESSM', 'Fédération Française d''Études et de Sports Sous-Marins'),
('FFESSM E4', 'E4 (Instructeur national)', 'Formation de tous niveaux- Formation E1-E2-E3- Jurys examens- Expertise nationale', true, 'FFESSM', 'Fédération Française d''Études et de Sports Sous-Marins'),

-- FSGT
('FSGT A1', 'Apnée 1 FSGT', '-10 à -15m', false, 'FSGT', 'Fédération Sportive et Gymnique du Travail'),
('FSGT A2', 'Apnée 2 FSGT', '-20 à -25m', false, 'FSGT', 'Fédération Sportive et Gymnique du Travail'),
('FSGT A3', 'Apnée 3 FSGT', '-30 à -40m', false, 'FSGT', 'Fédération Sportive et Gymnique du Travail'),
('FSGT CT', 'Cadre Technique', 'Formation formateurs- Jurys- Expertise régionale/nationale', true, 'FSGT', 'Fédération Sportive et Gymnique du Travail'),
('FSGT EA1', 'EA1', 'Découverte/baptêmes- Assistance formations- Pas autonomie complète', true, 'FSGT', 'Fédération Sportive et Gymnique du Travail'),
('FSGT EA2', 'EA2', 'Apnée 1 FSGT autonome- Apnée 2 FSGT autonome ou tutorat selon comité- Assistance Apnée 3', true, 'FSGT', 'Fédération Sportive et Gymnique du Travail'),
('FSGT EA3', 'EA3', 'Tous niveaux élèves (Apnée 1-2-3 FSGT)- Formation EA1-EA2- Responsable technique club', true, 'FSGT', 'Fédération Sportive et Gymnique du Travail'),

-- Molchanovs
('MOL Wave 1', 'Wave 1', '-20m', false, 'Molchanovs', NULL),
('MOL Wave 2', 'Wave 2', '-30m', false, 'Molchanovs', NULL),
('MOL Wave 3', 'Wave 3', '-40m', false, 'Molchanovs', NULL),
('MOL Wave 4', 'Wave 4', '-55m', false, 'Molchanovs', NULL),
('MOL Wave 5', 'Wave 5', '-70m', false, 'Molchanovs', NULL),
('MOL Instructor', 'Instructor', 'Wave 1-2, Lap 1-2', true, 'Molchanovs', NULL),
('MOL Advanced Instructor', 'Advanced Instructor', 'Wave 1-3, Lap 1-3', true, 'Molchanovs', NULL),
('MOL Master Instructor', 'Master Instructor', 'Tous niveaux + formation instructeurs', true, 'Molchanovs', NULL),

-- PADI
('PADI Basic Freediver', 'PADI Basic Freediver', '-10m', false, 'PADI', 'Professional Association of Diving Instructors'),
('PADI Freediver', 'PADI Freediver', '-16m', false, 'PADI', 'Professional Association of Diving Instructors'),
('PADI Advanced Freediver', 'PADI Advanced Freediver', '-24m', false, 'PADI', 'Professional Association of Diving Instructors'),
('PADI Master Freediver', 'PADI Master Freediver', '-32m', false, 'PADI', 'Professional Association of Diving Instructors'),
('PADI Freediver Instructor', 'PADI Freediver Instructor', 'Basic Freediver- PADI Freediver- Advanced Freediver- Réseau mondial PADI', true, 'PADI', 'Professional Association of Diving Instructors'),

-- SSI
('SSI TF', 'Try Freediving', '-5m', false, 'SSI', 'Scuba Schools International'),
('SSI BF', 'Basic Freediving', '-12m', false, 'SSI', 'Scuba Schools International'),
('SSI 1', 'SSI 1', '-20m', false, 'SSI', 'Scuba Schools International'),
('SSI 2', 'SSI 2', '-30m', false, 'SSI', 'Scuba Schools International'),
('SSI 3', 'SSI 3', '-40m', false, 'SSI', 'Scuba Schools International'),
('SSI MF', 'Master Freediver', '-', false, 'SSI', 'Scuba Schools International'),
('SSI DM', 'Divemaster (DM)', 'Premier niveau professionnel- Encadrement de plongeurs certifiés- Assistance pédagogique aux instructeurs', true, 'SSI', 'Scuba Schools International'),
('SSI AI', 'Assistant Instructor (AI)', 'Niveau intermédiaire entre Divemaster et Instructeur- Enseignement partiel sous supervision', true, 'SSI', 'Scuba Schools International'),
('SSI OWI', 'Open Water Instructor (OWI)', 'Instructeur autonome- Formation et certification jusqu''à Open Water Diver', true, 'SSI', 'Scuba Schools International'),
('SSI AOWI', 'Advanced Open Water Instructor (AOWI)', 'Instructeur étendu- Certification Advanced Adventurer et spécialités', true, 'SSI', 'Scuba Schools International'),
('SSI Master Instructor', 'Master Instructor', 'Instructeur senior reconnu par SSI- Large portefeuille de spécialités', true, 'SSI', 'Scuba Schools International'),
('SSI Divemaster Instructor', 'Divemaster Instructor', 'Formation et certification des Divemasters- Responsabilité d''encadrement professionnel', true, 'SSI', 'Scuba Schools International'),
('SSI IT', 'Instructor Trainer (IT)', 'Formateur d''instructeurs- Conduit les Instructor Training Courses (ITC)', true, 'SSI', 'Scuba Schools International');
