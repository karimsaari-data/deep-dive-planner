-- Alerte licences à J-3 : une seule fois par sortie (envoyée par la fonction edge send-reminders).
ALTER TABLE public.outings
  ADD COLUMN IF NOT EXISTS license_alert_sent boolean NOT NULL DEFAULT false;
