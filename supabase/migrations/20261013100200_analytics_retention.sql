-- Analytics retention. Kept apart from the main analytics migrations because it updates and
-- deletes rows, which the Supabase connector holds for confirmation.
--
-- Once a day: clear raw IP addresses older than 90 days and remove views older than 400 days.

create or replace function private.analytics_housekeeping()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.page_views set ip = null
    where ip is not null and created_at < now() - interval '90 days';
  delete from public.page_views where created_at < now() - interval '400 days';
$$;
revoke all on function private.analytics_housekeeping() from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.schedule('analytics-housekeeping', '17 3 * * *', 'select private.analytics_housekeeping()');

-- Only the web server (gate) and the admin need these.
revoke all on function public.record_page_view(text, text, text, text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.record_page_view(text, text, text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
revoke all on function public.analytics_summary(integer) from public, anon;
grant execute on function public.analytics_summary(integer) to authenticated;

-- A probe left behind while diagnosing the connector.
drop function if exists private.analytics_probe();
