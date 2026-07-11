-- Planification des rappels de sortie (24h avant) via pg_cron.
--
-- Contexte : la fonction edge `send-reminders` existait mais n'était jamais
-- appelée (aucun job planifié) -> 0 rappel envoyé. On met en place un cron
-- horaire qui déclenche la fonction. L'authentification se fait via un token
-- interne aléatoire stocké dans Vault (jamais exposé dans le code ni dans la
-- définition du job cron), validé par la fonction edge grâce à la RPC
-- `check_reminders_token` (réservée au rôle service_role).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1) Token interne stocké dans Vault (généré une seule fois, idempotent).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'send_reminders_token') then
    perform vault.create_secret(
      gen_random_uuid()::text,
      'send_reminders_token',
      'Token interne utilisé par le cron pour authentifier les appels à la fonction edge send-reminders'
    );
  end if;
end $$;

-- 2) RPC de validation du token, réservée à service_role (appelée par la fonction edge).
create or replace function public.check_reminders_token(p_token text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from vault.decrypted_secrets
    where name = 'send_reminders_token'
      and decrypted_secret = p_token
  );
$$;

revoke all on function public.check_reminders_token(text) from public, anon, authenticated;
grant execute on function public.check_reminders_token(text) to service_role;

-- 3) Fonction déclencheur : lit le token dans Vault et POST vers la fonction edge.
create or replace function public.trigger_send_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name = 'send_reminders_token';

  perform net.http_post(
    url     := 'https://hyoudezyqbivfthcgpma.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_token
    ),
    body    := '{}'::jsonb
  );
end;
$$;

revoke all on function public.trigger_send_reminders() from public, anon, authenticated;

-- 4) Planification horaire (upsert par nom, idempotent).
select cron.schedule(
  'send-reminders-hourly',
  '0 * * * *',
  $$ select public.trigger_send_reminders(); $$
);
