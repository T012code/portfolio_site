-- Cookie consent log. The NDPA General Application and Implementation Directive 2025, Art. 17(6):
-- a controller relying on consent keeps a record of it.
--
-- The site's cookie notice records each choice through record_consent(), which requires the same
-- server gate as analytics (derived from MAIL_SECRET). A row holds the random id the visitor's
-- browser keeps with its choice, whether visit counting was accepted, the notice version shown and
-- when. No IP address, location or device details. Only the signed-in admin can read it.
-- Retention is in the consent_log_retention migration.

create table public.consent_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  consent_id text not null check (consent_id ~ '^[A-Za-z0-9-]{8,64}$'),
  analytics boolean not null,
  notice_version smallint not null check (notice_version between 1 and 1000)
);

create index consent_log_created_at_idx on public.consent_log (created_at desc);
create index consent_log_consent_id_idx on public.consent_log (consent_id, created_at desc);

alter table public.consent_log enable row level security;
create policy consent_log_admin_read on public.consent_log for select to authenticated
  using ((select private.is_admin()));
revoke insert, update, delete on public.consent_log from anon, authenticated;

-- ── Server only: record one choice ──────────────────────────────────────
create or replace function public.record_consent(
  p_gate text,
  p_consent_id text,
  p_analytics boolean,
  p_version integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.mail_gate_ok(p_gate) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- The same choice sent twice from one browser within a minute (a retry) counts once.
  if exists (
    select 1 from public.consent_log c
    where c.consent_id = p_consent_id
      and c.analytics = p_analytics
      and c.notice_version = p_version
      and c.created_at > now() - interval '1 minute'
  ) then
    return;
  end if;

  insert into public.consent_log (consent_id, analytics, notice_version)
  values (p_consent_id, p_analytics, p_version);
end;
$$;
revoke all on function public.record_consent(text, text, boolean, integer) from public;
grant execute on function public.record_consent(text, text, boolean, integer) to anon, authenticated;

-- ── Admin only: how visitors answered the notice ────────────────────────
-- Each browser counts once, by its latest choice in the period.
create or replace function public.consent_summary(p_days integer)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with latest as (
    select distinct on (c.consent_id) c.analytics
    from public.consent_log c
    where c.created_at >= now() - make_interval(days => greatest(1, least(p_days, 3650)))
    order by c.consent_id, c.created_at desc
  )
  select jsonb_build_object(
    'accepted', count(*) filter (where analytics),
    'rejected', count(*) filter (where not analytics)
  )
  from latest;
$$;
revoke all on function public.consent_summary(integer) from public, anon;
grant execute on function public.consent_summary(integer) to authenticated;
