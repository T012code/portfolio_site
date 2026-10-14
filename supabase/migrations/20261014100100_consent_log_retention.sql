-- Consent log retention. Kept apart from the consent_log migration because it deletes rows, which
-- the Supabase connector holds for confirmation.
--
-- A choice is asked again after 12 months, and visit records made under it are deleted 400 days
-- after they're made, so a record of consent is needed for about 25 months. Once a day, remove
-- choices older than 800 days.

create or replace function private.consent_log_housekeeping()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.consent_log where created_at < now() - interval '800 days';
$$;
revoke all on function private.consent_log_housekeeping() from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.schedule('consent-log-housekeeping', '23 3 * * *', 'select private.consent_log_housekeeping()');
