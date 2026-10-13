-- Recording (server gate) and the admin summary for page_views.

-- ── Server only: record one page view ───────────────────────────────────
create or replace function public.record_page_view(
  p_gate text,
  p_path text,
  p_title text,
  p_referrer_host text,
  p_utm_source text,
  p_visitor_id text,
  p_session_id text,
  p_ip text,
  p_country text,
  p_region text,
  p_city text,
  p_device text,
  p_browser text,
  p_os text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ip inet;
begin
  if not private.mail_gate_ok(p_gate) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- The same visitor reloading the same page within 10 seconds counts once.
  if exists (
    select 1 from public.page_views v
    where v.visitor_id = p_visitor_id
      and v.path = p_path
      and v.created_at > now() - interval '10 seconds'
  ) then
    return;
  end if;

  begin
    v_ip := nullif(p_ip, '')::inet;
  exception when others then
    v_ip := null;
  end;

  insert into public.page_views (
    path, title, referrer_host, utm_source, visitor_id, session_id, ip,
    country, region, city, device, browser, os
  ) values (
    left(p_path, 512),
    nullif(left(coalesce(p_title, ''), 300), ''),
    nullif(left(coalesce(p_referrer_host, ''), 253), ''),
    nullif(left(coalesce(p_utm_source, ''), 100), ''),
    p_visitor_id,
    p_session_id,
    v_ip,
    case when p_country similar to '[A-Z]{2}' then p_country end,
    nullif(left(coalesce(p_region, ''), 100), ''),
    nullif(left(coalesce(p_city, ''), 100), ''),
    case when p_device in ('desktop', 'mobile', 'tablet') then p_device else 'desktop' end,
    nullif(left(coalesce(p_browser, ''), 40), ''),
    nullif(left(coalesce(p_os, ''), 40), '')
  );
end;
$$;
grant execute on function public.record_page_view(text, text, text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

-- ── Admin only: everything the analytics page shows, in one round trip ──
-- Days are bucketed in Lagos time. A "visit" is a session; when the browser sent no session id,
-- a visitor's views on one day count as one visit.
create or replace function public.analytics_summary(p_days integer)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 366));
  v_tz text := 'Africa/Lagos';
  v_now timestamptz := now();
  v_from timestamptz;
  v_prev timestamptz;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if not (select private.is_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_from := ((v_today - (v_days - 1))::timestamp at time zone v_tz);
  v_prev := v_from - make_interval(days => v_days);

  return (
    with cur as (
      select v.*, coalesce(v.session_id, v.visitor_id || ':' || ((v.created_at at time zone v_tz)::date)::text) as visit
      from public.page_views v
      where v.created_at >= v_from
    ),
    prev as (
      select v.*, coalesce(v.session_id, v.visitor_id || ':' || ((v.created_at at time zone v_tz)::date)::text) as visit
      from public.page_views v
      where v.created_at >= v_prev and v.created_at < v_from
    ),
    visits as (
      select visit, count(*) as views from cur group by visit
    )
    select jsonb_build_object(
      'days', v_days,
      'totals', jsonb_build_object(
        'visitors', (select count(distinct visitor_id) from cur),
        'views', (select count(*) from cur),
        'visits', (select count(*) from visits),
        'bounce_rate', (select case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where views = 1) / count(*)) end from visits),
        'views_per_visit', (select case when count(*) = 0 then 0 else round(avg(views)::numeric, 1) end from visits)
      ),
      'previous', jsonb_build_object(
        'visitors', (select count(distinct visitor_id) from prev),
        'views', (select count(*) from prev),
        'visits', (select count(distinct visit) from prev)
      ),
      'reach', jsonb_build_object(
        'live', (select count(distinct visitor_id) from public.page_views where created_at > v_now - interval '5 minutes'),
        'day', (select count(distinct visitor_id) from public.page_views where created_at > v_now - interval '24 hours'),
        'week', (select count(distinct visitor_id) from public.page_views where created_at > v_now - interval '7 days'),
        'month', (select count(distinct visitor_id) from public.page_views where created_at > v_now - interval '30 days'),
        'quarter', (select count(distinct visitor_id) from public.page_views where created_at > v_now - interval '90 days'),
        'all', (select count(distinct visitor_id) from public.page_views)
      ),
      'daily', (
        select coalesce(jsonb_agg(jsonb_build_object('date', d.day::date, 'visitors', coalesce(x.visitors, 0), 'views', coalesce(x.views, 0)) order by d.day), '[]'::jsonb)
        from generate_series(v_today - (v_days - 1), v_today, interval '1 day') as d(day)
        left join (
          select (created_at at time zone v_tz)::date as day, count(distinct visitor_id) as visitors, count(*) as views
          from cur group by 1
        ) x on x.day = d.day::date
      ),
      'countries', (
        select coalesce(jsonb_agg(c order by c.visitors desc, c.views desc), '[]'::jsonb) from (
          select coalesce(country, '??') as code, count(distinct visitor_id) as visitors, count(*) as views
          from cur group by 1
        ) c
      ),
      'cities', (
        select coalesce(jsonb_agg(c order by c.visitors desc), '[]'::jsonb) from (
          select city, country as code, count(distinct visitor_id) as visitors
          from cur where city is not null group by city, country order by 3 desc limit 10
        ) c
      ),
      'pages', (
        select coalesce(jsonb_agg(p order by p.views desc), '[]'::jsonb) from (
          select path, count(*) as views, count(distinct visitor_id) as visitors
          from cur group by path order by 2 desc limit 12
        ) p
      ),
      'referrers', (
        select coalesce(jsonb_agg(r order by r.visitors desc), '[]'::jsonb) from (
          select coalesce(referrer_host, 'Direct') as source, count(distinct visitor_id) as visitors
          from cur group by 1 order by 2 desc limit 10
        ) r
      ),
      'devices', (
        select coalesce(jsonb_agg(d order by d.visitors desc), '[]'::jsonb) from (
          select device as name, count(distinct visitor_id) as visitors from cur group by 1
        ) d
      ),
      'browsers', (
        select coalesce(jsonb_agg(b order by b.visitors desc), '[]'::jsonb) from (
          select coalesce(browser, 'Other') as name, count(distinct visitor_id) as visitors from cur group by 1 order by 2 desc limit 6
        ) b
      ),
      'systems', (
        select coalesce(jsonb_agg(o order by o.visitors desc), '[]'::jsonb) from (
          select coalesce(os, 'Other') as name, count(distinct visitor_id) as visitors from cur group by 1 order by 2 desc limit 6
        ) o
      ),
      'recent', (
        select coalesce(jsonb_agg(r order by r.last_seen desc), '[]'::jsonb) from (
          select * from (
            select distinct on (v.visitor_id)
              v.visitor_id, v.created_at as last_seen, host(v.ip) as ip, v.country as code, v.region, v.city, v.path,
              v.device, v.browser, v.os, v.referrer_host,
              (select count(*) from public.page_views p2 where p2.visitor_id = v.visitor_id) as total_views
            from (select * from public.page_views order by created_at desc limit 500) v
            order by v.visitor_id, v.created_at desc
          ) latest
          order by latest.last_seen desc
          limit 5
        ) r
      )
    )
  );
end;
$$;
grant execute on function public.analytics_summary(integer) to authenticated;
