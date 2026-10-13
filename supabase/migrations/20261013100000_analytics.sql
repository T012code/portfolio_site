-- Site analytics, first-party and cookieless.
--
-- The web server records each page view through record_page_view(), which requires the same
-- server gate as the mail functions (derived from MAIL_SECRET), so nothing else that can reach
-- the API can write visits or forge IP addresses. Only the signed-in admin can read them.
-- Retention (IPs cleared after 90 days, rows removed after 400) is in the analytics_retention migration.

create table public.page_views (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path text not null check (char_length(path) between 1 and 512),
  title text check (char_length(title) <= 300),
  referrer_host text check (char_length(referrer_host) <= 253),
  utm_source text check (char_length(utm_source) <= 100),
  visitor_id text not null check (visitor_id ~ '^[0-9a-f]{64}$'),
  session_id text check (session_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  ip inet,
  country text check (country ~ '^[A-Z]{2}$'),
  region text check (char_length(region) <= 100),
  city text check (char_length(city) <= 100),
  device text not null default 'desktop' check (device in ('desktop', 'mobile', 'tablet')),
  browser text check (char_length(browser) <= 40),
  os text check (char_length(os) <= 40)
);

create index page_views_created_at_idx on public.page_views (created_at desc);
create index page_views_visitor_idx on public.page_views (visitor_id, created_at desc);

alter table public.page_views enable row level security;
create policy page_views_admin_read on public.page_views for select to authenticated
  using ((select private.is_admin()));
create policy page_views_admin_delete on public.page_views for delete to authenticated
  using ((select private.is_admin()));
revoke insert, update on public.page_views from anon, authenticated;
