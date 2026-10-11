-- Email, managed from the dashboard: SMTP settings, autoresponder templates and a delivery log.
--
-- The SMTP password never sits in an API-readable table. The web server encrypts it with a
-- server-only key (MAIL_SECRET) and it is stored in the private schema. The server reads
-- settings and writes the log through security-definer functions that require a "gate" value
-- derived from that same key, so only the web server can use them, including for anonymous
-- contact-form submissions.

-- ── Settings (one row) ──────────────────────────────────────────────────
create table public.mail_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  host text not null default 'smtppro.zoho.com' check (char_length(host) <= 253),
  port integer not null default 465 check (port between 1 and 65535),
  security text not null default 'ssl' check (security in ('ssl', 'starttls')),
  username text not null default '' check (char_length(username) <= 254),
  from_name text not null default 'Layò' check (char_length(from_name) <= 80),
  from_email text not null default 'hello@layothedeveloper.com' check (char_length(from_email) <= 254),
  notify_email text not null default '' check (char_length(notify_email) <= 254),
  notify_enquiries boolean not null default true,
  notify_messages boolean not null default true,
  dkim_selector text not null default 'zmail' check (dkim_selector ~ '^[a-z0-9._-]{1,63}$'),
  updated_at timestamptz not null default now()
);
insert into public.mail_settings (id) values (true) on conflict (id) do nothing;

create trigger mail_settings_touch before update on public.mail_settings
  for each row execute function public.touch_updated_at();

alter table public.mail_settings enable row level security;
create policy mail_settings_admin_read on public.mail_settings for select to authenticated
  using ((select private.is_admin()));
create policy mail_settings_admin_write on public.mail_settings for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ── Secret (private schema: not reachable through the API) ──────────────
create table private.mail_secret (
  id boolean primary key default true check (id),
  password_enc text,
  gate_hash text,
  updated_at timestamptz not null default now()
);
insert into private.mail_secret (id) values (true) on conflict (id) do nothing;
revoke all on private.mail_secret from public, anon, authenticated;

-- ── Autoresponder templates ─────────────────────────────────────────────
create table public.mail_templates (
  key text primary key check (key in ('enquiry_autoreply', 'message_autoreply')),
  label text not null,
  enabled boolean not null default true,
  subject text not null default '' check (char_length(subject) <= 200),
  body text not null default '' check (char_length(body) <= 5000),
  updated_at timestamptz not null default now()
);

create trigger mail_templates_touch before update on public.mail_templates
  for each row execute function public.touch_updated_at();

alter table public.mail_templates enable row level security;
create policy mail_templates_admin_read on public.mail_templates for select to authenticated
  using ((select private.is_admin()));
create policy mail_templates_admin_write on public.mail_templates for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

insert into public.mail_templates (key, label, subject, body) values
(
  'enquiry_autoreply',
  'Service enquiry',
  'Thanks for your enquiry, {{first_name}}',
  E'Hi {{first_name}},\n\nThanks for getting in touch about {{service}}. Your enquiry has reached me and I''ll reply within 24 hours.\n\nIf you haven''t picked a call time yet, you can book one here:\n{{booking_url}}\n\nTalk soon,\n{{site_name}}\n{{site_url}}'
),
(
  'message_autoreply',
  'Quick message',
  'Thanks for your message, {{first_name}}',
  E'Hi {{first_name}},\n\nThanks for your message. It has reached me and I''ll get back to you within 24 hours.\n\nTalk soon,\n{{site_name}}\n{{site_url}}'
)
on conflict (key) do nothing;

-- ── Delivery log ────────────────────────────────────────────────────────
create table public.mail_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('notification', 'autoreply', 'reply', 'test')),
  to_email text not null check (char_length(to_email) <= 254),
  subject text not null default '' check (char_length(subject) <= 300),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  detail text not null default '' check (char_length(detail) <= 1000),
  message_id text check (char_length(message_id) <= 300),
  ref_type text check (ref_type in ('enquiry', 'message')),
  ref_id uuid
);
create index mail_log_created_idx on public.mail_log (created_at desc);
create index mail_log_ref_idx on public.mail_log (ref_id) where ref_id is not null;
create index mail_log_recipient_idx on public.mail_log (to_email, kind, created_at desc);

alter table public.mail_log enable row level security;
create policy mail_log_admin_read on public.mail_log for select to authenticated
  using ((select private.is_admin()));

-- ── Server gate ─────────────────────────────────────────────────────────
create or replace function private.mail_gate_ok(p_gate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.mail_secret s
    where s.gate_hash is not null
      and s.gate_hash = encode(sha256(convert_to(coalesce(p_gate, ''), 'UTF8')), 'hex')
  );
$$;
revoke all on function private.mail_gate_ok(text) from public, anon, authenticated;

-- Settings, encrypted password and templates, for the web server only.
create or replace function public.mail_runtime(p_gate text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.mail_gate_ok(p_gate) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'settings', (select to_jsonb(m) from public.mail_settings m where m.id),
    'password_enc', (select s.password_enc from private.mail_secret s where s.id),
    'templates', coalesce((select jsonb_object_agg(t.key, to_jsonb(t)) from public.mail_templates t), '{}'::jsonb)
  );
end;
$$;

-- Opens a log row. Autoreplies are limited to one per address per 24 hours and 30 per hour
-- overall, so the contact form can't be used to send mail at volume.
create or replace function public.mail_log_begin(
  p_gate text, p_kind text, p_to text, p_subject text, p_ref_type text, p_ref_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_to text := lower(trim(coalesce(p_to, '')));
  v_reason text;
  v_id uuid;
begin
  if not private.mail_gate_ok(p_gate) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_kind = 'autoreply' then
    perform pg_advisory_xact_lock(hashtext('autoreply:' || v_to));
    if exists (
      select 1 from public.mail_log l
      where l.to_email = v_to and l.kind = 'autoreply' and l.status in ('queued', 'sent')
        and l.created_at > now() - interval '24 hours'
    ) then
      v_reason := 'Already auto-replied to this address in the last 24 hours.';
    elsif (
      select count(*) from public.mail_log l
      where l.kind = 'autoreply' and l.status in ('queued', 'sent')
        and l.created_at > now() - interval '1 hour'
    ) >= 30 then
      v_reason := 'Hourly autoreply limit reached.';
    end if;
  end if;

  insert into public.mail_log (kind, to_email, subject, status, detail, ref_type, ref_id)
  values (p_kind, v_to, left(coalesce(p_subject, ''), 300),
          case when v_reason is null then 'queued' else 'skipped' end,
          coalesce(v_reason, ''), p_ref_type, p_ref_id)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'allowed', v_reason is null);
end;
$$;

create or replace function public.mail_log_finish(
  p_gate text, p_id uuid, p_status text, p_detail text, p_message_id text
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
  update public.mail_log
     set status = p_status,
         detail = left(coalesce(p_detail, ''), 1000),
         message_id = left(p_message_id, 300)
   where id = p_id and status = 'queued';
end;
$$;

revoke all on function public.mail_runtime(text) from public;
revoke all on function public.mail_log_begin(text, text, text, text, text, uuid) from public;
revoke all on function public.mail_log_finish(text, uuid, text, text, text) from public;
grant execute on function public.mail_runtime(text) to anon, authenticated;
grant execute on function public.mail_log_begin(text, text, text, text, text, uuid) to anon, authenticated;
grant execute on function public.mail_log_finish(text, uuid, text, text, text) to anon, authenticated;

-- ── Admin-only: store the encrypted password and register the gate ────
create or replace function public.mail_set_secret(p_password_enc text, p_gate_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_gate_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid gate' using errcode = '22023';
  end if;
  update private.mail_secret
     set gate_hash = p_gate_hash,
         password_enc = case when p_password_enc is null then password_enc
                             when p_password_enc = '' then null
                             else p_password_enc end,
         updated_at = now()
   where id;
end;
$$;

create or replace function public.mail_secret_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return (select jsonb_build_object(
    'password_set', s.password_enc is not null,
    'gate_set', s.gate_hash is not null,
    'updated_at', s.updated_at
  ) from private.mail_secret s where s.id);
end;
$$;

revoke all on function public.mail_set_secret(text, text) from public, anon;
revoke all on function public.mail_secret_status() from public, anon;
grant execute on function public.mail_set_secret(text, text) to authenticated;
grant execute on function public.mail_secret_status() to authenticated;

-- ── Admins: manage who can sign in to the dashboard ─────────────────────
-- Removing an admin switches their access off (reversible by adding them again).
alter table public.admins add column if not exists disabled_at timestamptz;

create or replace function private.is_admin()
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
         and a.disabled_at is null
     );
$$;

create or replace function public.admin_list()
returns table (email text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select a.email, a.created_at from public.admins a
    where a.disabled_at is null and a.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' order by a.created_at;
end;
$$;

create or replace function public.admin_add(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_email text := lower(trim(coalesce(p_email, '')));
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  insert into public.admins (email) values (v_email)
  on conflict (email) do update set disabled_at = null;
end;
$$;

create or replace function public.admin_remove(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_email text := lower(trim(coalesce(p_email, '')));
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_email = lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'cannot_remove_self' using errcode = '22023';
  end if;
  update public.admins set disabled_at = now() where email = v_email and disabled_at is null;
end;
$$;

revoke all on function public.admin_list() from public, anon;
revoke all on function public.admin_add(text) from public, anon;
revoke all on function public.admin_remove(text) from public, anon;
grant execute on function public.admin_list() to authenticated;
grant execute on function public.admin_add(text) to authenticated;
grant execute on function public.admin_remove(text) to authenticated;
