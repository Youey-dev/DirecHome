-- ==============================================================================
-- OwnersMarket — Migration 014: Email notifications
-- Run ONCE in Supabase Dashboard -> SQL Editor (after 013). Safe to run twice.
-- The website works before and after this runs.
--
-- Every in-app notification (new message, viewing update, listing approved / sent back /
-- paused, new listing to review...) is also emailed, through Resend, if it is still unread
-- 2 minutes after it was created. Several messages in one conversation become one email.
--
--   1. users.email_notify: the person's on/off switch (on by default).
--   2. notifications.emailed_at / email_status / email_attempts: what was sent.
--   3. Every 2 minutes, pg_cron calls the "send-notification-emails" edge function.
--      The call carries a random secret kept in Supabase Vault; the function checks it.
-- ==============================================================================

-- Extensions used by the scheduler (no-ops if already on)
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- 1. On/off switch
alter table public.users add column if not exists email_notify boolean not null default true;

-- 2. Delivery tracking. The first time this runs, notifications that already exist are
--    marked as handled, so nobody gets a pile of emails about old news.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications' and column_name = 'emailed_at'
  ) then
    alter table public.notifications add column emailed_at timestamptz;
    alter table public.notifications add column email_status text;
    update public.notifications set emailed_at = now(), email_status = 'before email launch';
  end if;
end $$;
alter table public.notifications add column if not exists emailed_at timestamptz;
alter table public.notifications add column if not exists email_status text;
alter table public.notifications add column if not exists email_attempts integer not null default 0;
create index if not exists idx_notifications_email_queue
  on public.notifications (created_at)
  where emailed_at is null and read_at is null;

-- 3. The secret the scheduler sends to the edge function
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'email_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'email_cron_secret');
  end if;
end $$;

-- The edge function asks the database whether the secret it received is right.
-- Only the server (service role) can call this.
create or replace function public.email_cron_secret_ok(_s text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'email_cron_secret' and decrypted_secret = _s
  );
$$;
revoke execute on function public.email_cron_secret_ok(text) from public, anon, authenticated;
grant execute on function public.email_cron_secret_ok(text) to service_role;

-- Every 2 minutes (re-running this replaces the job)
select cron.schedule(
  'send-notification-emails',
  '*/2 * * * *',
  $job$
  select net.http_post(
    url := 'https://kpmadcjvwjnsnawtwjnn.supabase.co/functions/v1/send-notification-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'email_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $job$
);
