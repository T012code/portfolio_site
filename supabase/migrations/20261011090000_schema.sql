-- Portfolio schema: content tables, inbox tables, admin gate, storage.
-- Writes require an allow-listed admin email AND an MFA-verified session (aal2).

-- ─── Admin gate ──────────────────────────────────────────────────────────
create table public.admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- No policies: the table is invisible to the API. Only is_admin() reads it.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (
       select 1 from public.admins a
       where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
     );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Site settings (single row) ─────────────────────────────────────────
create table public.site_settings (
  id boolean primary key default true check (id),
  display_name text not null default 'Layò',
  full_name text not null default '',
  taglines text[] not null default '{}',
  role_line text not null default '',
  email text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  location text not null default '',
  linkedin_url text not null default '',
  github_url text not null default '',
  cal_link text not null default '',
  cv_path text,
  portrait_path text,
  portrait_alt text not null default '',
  seo_title text not null default '',
  seo_description text not null default '',
  og_image_path text,
  service_options text[] not null default '{}',
  budget_options text[] not null default '{}',
  timeline_options text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ─── Page copy blocks, keyed by page + block ────────────────────────────
create table public.page_blocks (
  page text not null,
  key text not null,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (page, key)
);

-- ─── Lists ──────────────────────────────────────────────────────────────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  role text not null default '',
  summary text not null default '',
  tags text[] not null default '{}',
  image_path text,
  image_alt text not null default '',
  live_url text,
  year text not null default '',
  featured boolean not null default false,
  published boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_sort_idx on public.projects (sort);

create table public.capabilities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_body text not null default '',
  body text not null default '',
  published boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  tags text[] not null default '{}',
  published boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.process_steps (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.experience (
  id uuid primary key default gen_random_uuid(),
  org text not null,
  title text not null,
  meta text not null default '',
  start_date date not null,
  end_date date, -- null = present
  summary text not null default '',
  highlights text not null default '',
  published boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  published boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  alt text not null default '',
  mime text not null default '',
  size_bytes bigint not null default 0,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

-- ─── Inbox ──────────────────────────────────────────────────────────────
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  whatsapp text not null default '',
  company text not null default '',
  service text not null default '',
  budget text not null default '',
  timeline text not null default '',
  message text not null,
  status text not null default 'new' check (status in ('new', 'booked', 'replied', 'archived')),
  booking_uid text,
  booking_start timestamptz,
  admin_notes text not null default '',
  updated_at timestamptz not null default now()
);
create index enquiries_created_idx on public.enquiries (created_at desc);
create index enquiries_email_idx on public.enquiries (email, created_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  whatsapp text not null default '',
  message text not null,
  status text not null default 'new' check (status in ('new', 'replied', 'archived')),
  admin_notes text not null default '',
  updated_at timestamptz not null default now()
);
create index messages_created_idx on public.messages (created_at desc);
create index messages_email_idx on public.messages (email, created_at desc);

-- ─── updated_at triggers ────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['site_settings','page_blocks','projects','capabilities','services',
                           'process_steps','experience','skills','enquiries','messages']
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
      t || '_touch', t);
  end loop;
end $$;

-- ─── RLS ────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  -- Content everyone may read in full
  foreach t in array array['site_settings','page_blocks','process_steps']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)',
                   t || '_public_read', t);
    execute format('create policy %I on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
                   t || '_admin_write', t);
  end loop;

  -- Content with a published flag
  foreach t in array array['projects','capabilities','services','experience','skills']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (published or (select public.is_admin()))',
                   t || '_public_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()))',
                   t || '_admin_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
                   t || '_admin_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))',
                   t || '_admin_delete', t);
  end loop;

  -- Admin-only tables (inbox inserts go through the submit_* functions)
  foreach t in array array['media','enquiries','messages']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
                   t || '_admin_all', t);
  end loop;
end $$;

-- ─── Public form submissions ────────────────────────────────────────────
create or replace function public.submit_enquiry(
  p_name text, p_email text, p_whatsapp text, p_company text,
  p_service text, p_budget text, p_timeline text, p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
begin
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 120 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_message, ''))) not between 10 and 5000 then
    raise exception 'invalid_message' using errcode = '22023';
  end if;
  if char_length(coalesce(p_whatsapp, '')) > 40
     or char_length(coalesce(p_company, '')) > 160
     or char_length(coalesce(p_service, '')) > 120
     or char_length(coalesce(p_budget, '')) > 120
     or char_length(coalesce(p_timeline, '')) > 120 then
    raise exception 'field_too_long' using errcode = '22023';
  end if;
  if (select count(*) from public.enquiries
      where email = v_email and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from public.enquiries
         where created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.enquiries (name, email, whatsapp, company, service, budget, timeline, message)
  values (trim(p_name), v_email, trim(coalesce(p_whatsapp, '')), trim(coalesce(p_company, '')),
          trim(coalesce(p_service, '')), trim(coalesce(p_budget, '')), trim(coalesce(p_timeline, '')),
          trim(p_message))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.submit_message(
  p_name text, p_email text, p_whatsapp text, p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
begin
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 120 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_message, ''))) not between 2 and 5000 then
    raise exception 'invalid_message' using errcode = '22023';
  end if;
  if char_length(coalesce(p_whatsapp, '')) > 40 then
    raise exception 'field_too_long' using errcode = '22023';
  end if;
  if (select count(*) from public.messages
      where email = v_email and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.messages
         where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.messages (name, email, whatsapp, message)
  values (trim(p_name), v_email, trim(coalesce(p_whatsapp, '')), trim(p_message))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.submit_enquiry(text, text, text, text, text, text, text, text) from public;
revoke all on function public.submit_message(text, text, text, text) from public;
grant execute on function public.submit_enquiry(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.submit_message(text, text, text, text) to anon, authenticated;

-- ─── Storage: one public bucket for images and the CV ───────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'application/pdf'])
on conflict (id) do nothing;

create policy media_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
create policy media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));
create policy media_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));
create policy media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
