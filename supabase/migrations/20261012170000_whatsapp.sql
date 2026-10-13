-- WhatsApp Business (Meta Cloud API): automatic replies to incoming WhatsApp messages, an
-- optional template message to visitors who leave a WhatsApp number on the enquiry form,
-- replies from the dashboard, and a message log. The access token and app secret are
-- encrypted by the web server (MAIL_SECRET) and kept in the private schema.

create table public.whatsapp_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  phone_number_id text not null default '' check (phone_number_id ~ '^[0-9]{0,30}$'),
  business_account_id text not null default '' check (business_account_id ~ '^[0-9]{0,30}$'),
  display_number text not null default '' check (char_length(display_number) <= 40),
  graph_version text not null default 'v23.0' check (graph_version ~ '^v[0-9]{1,2}\.[0-9]$'),
  verify_token text not null default encode(extensions.gen_random_bytes(18), 'hex')
    check (verify_token ~ '^[A-Za-z0-9_-]{16,80}$'),
  autoreply_enabled boolean not null default true,
  autoreply_body text not null default
    'Hi {{first_name}}, thanks for your message. I''ve received it and will reply as soon as I can, usually within one working day.

If it''s about a new project, you can also book a free 30-minute call here: {{booking_url}}

Layò'
    check (char_length(autoreply_body) <= 1024),
  autoreply_cooldown_hours integer not null default 24 check (autoreply_cooldown_hours between 1 and 168),
  form_template_enabled boolean not null default false,
  form_template_name text not null default '' check (form_template_name ~ '^[a-z0-9_]*$' and char_length(form_template_name) <= 512),
  form_template_lang text not null default 'en' check (form_template_lang ~ '^[a-z]{2,3}(_[A-Z]{2})?$'),
  notify_email boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.whatsapp_settings (id) values (true) on conflict (id) do nothing;

create trigger whatsapp_settings_touch before update on public.whatsapp_settings
  for each row execute function public.touch_updated_at();

alter table public.whatsapp_settings enable row level security;
create policy whatsapp_settings_admin_read on public.whatsapp_settings for select to authenticated
  using ((select private.is_admin()));
create policy whatsapp_settings_admin_write on public.whatsapp_settings for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

alter table private.mail_secret
  add column if not exists whatsapp_token_enc text,
  add column if not exists whatsapp_app_secret_enc text;

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  direction text not null check (direction in ('in', 'out')),
  kind text not null check (kind in ('inbound', 'autoreply', 'reply', 'template', 'test')),
  wa_id text not null check (wa_id ~ '^[0-9]{6,20}$'),
  contact_name text not null default '' check (char_length(contact_name) <= 120),
  wa_message_id text check (char_length(wa_message_id) <= 200),
  msg_type text not null default 'text' check (char_length(msg_type) <= 30),
  body text not null default '' check (char_length(body) <= 4096),
  status text not null default 'queued'
    check (status in ('received', 'queued', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  detail text not null default '' check (char_length(detail) <= 1000),
  ref_type text check (ref_type in ('enquiry', 'message')),
  ref_id uuid
);
create unique index whatsapp_messages_wamid_idx on public.whatsapp_messages (wa_message_id) where wa_message_id is not null;
create index whatsapp_messages_created_idx on public.whatsapp_messages (created_at desc);
create index whatsapp_messages_contact_idx on public.whatsapp_messages (wa_id, created_at desc);

alter table public.whatsapp_messages enable row level security;
create policy whatsapp_messages_admin_read on public.whatsapp_messages for select to authenticated
  using ((select private.is_admin()));
create policy whatsapp_messages_admin_delete on public.whatsapp_messages for delete to authenticated
  using ((select private.is_admin()));

-- ── Admin: store the encrypted token / app secret ───────────────────────
create or replace function public.whatsapp_set_secret(p_token_enc text, p_app_secret_enc text, p_gate_hash text)
returns void language plpgsql security definer set search_path = ''
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
         whatsapp_token_enc = case when p_token_enc is null then whatsapp_token_enc
                                   when p_token_enc = '' then null else p_token_enc end,
         whatsapp_app_secret_enc = case when p_app_secret_enc is null then whatsapp_app_secret_enc
                                        when p_app_secret_enc = '' then null else p_app_secret_enc end,
         updated_at = now()
   where id;
end;
$$;

create or replace function public.whatsapp_secret_status()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return (select jsonb_build_object(
    'token_set', s.whatsapp_token_enc is not null,
    'app_secret_set', s.whatsapp_app_secret_enc is not null
  ) from private.mail_secret s where s.id);
end;
$$;

-- ── Web server only (gated) ─────────────────────────────────────────────
create or replace function public.whatsapp_runtime(p_gate text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.mail_gate_ok(p_gate) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'settings', to_jsonb(w),
      'token_enc', s.whatsapp_token_enc,
      'app_secret_enc', s.whatsapp_app_secret_enc
    )
    from public.whatsapp_settings w, private.mail_secret s
    where w.id and s.id
  );
end;
$$;

-- Records an incoming message once (Meta can deliver the same webhook twice) and says whether
-- an automatic reply is due: none to this number within the cool-down, at most 30 an hour.
create or replace function public.whatsapp_log_inbound(
  p_gate text, p_wa_id text, p_name text, p_wamid text, p_type text, p_body text
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_hours integer;
  v_due boolean := false;
begin
  if not private.mail_gate_ok(p_gate) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.whatsapp_messages (direction, kind, wa_id, contact_name, wa_message_id, msg_type, body, status)
  values ('in', 'inbound', p_wa_id, left(coalesce(p_name, ''), 120), left(p_wamid, 200),
          left(coalesce(p_type, 'text'), 30), left(coalesce(p_body, ''), 4096), 'received')
  on conflict (wa_message_id) where wa_message_id is not null do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('id', null, 'duplicate', true, 'autoreply', false);
  end if;

  select autoreply_cooldown_hours into v_hours from public.whatsapp_settings where id;
  perform pg_advisory_xact_lock(hashtext('wa-autoreply:' || p_wa_id));
  v_due := not exists (
      select 1 from public.whatsapp_messages m
      where m.wa_id = p_wa_id and m.kind in ('autoreply', 'template') and m.status <> 'failed'
        and m.created_at > now() - make_interval(hours => coalesce(v_hours, 24))
    )
    and (
      select count(*) from public.whatsapp_messages m
      where m.kind in ('autoreply', 'template') and m.created_at > now() - interval '1 hour'
    ) < 30;

  return jsonb_build_object('id', v_id, 'duplicate', false, 'autoreply', v_due);
end;
$$;

create or replace function public.whatsapp_log_outbound(
  p_gate text, p_kind text, p_wa_id text, p_name text, p_body text, p_ref_type text, p_ref_id uuid
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.mail_gate_ok(p_gate) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.whatsapp_messages (direction, kind, wa_id, contact_name, body, status, ref_type, ref_id)
  values ('out', p_kind, p_wa_id, left(coalesce(p_name, ''), 120), left(coalesce(p_body, ''), 4096),
          'queued', p_ref_type, p_ref_id)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.whatsapp_log_finish(
  p_gate text, p_id uuid, p_status text, p_detail text, p_wamid text
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.mail_gate_ok(p_gate) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.whatsapp_messages
     set status = p_status, detail = left(coalesce(p_detail, ''), 1000), wa_message_id = left(p_wamid, 200)
   where id = p_id and status = 'queued';
end;
$$;

-- Delivery receipts from Meta: sent → delivered → read, or failed. Never moves backwards.
create or replace function public.whatsapp_status_update(p_gate text, p_wamid text, p_status text, p_detail text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.mail_gate_ok(p_gate) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.whatsapp_messages m
     set status = p_status,
         detail = case when p_status = 'failed' then left(coalesce(p_detail, ''), 1000) else m.detail end
   where m.wa_message_id = p_wamid and m.direction = 'out'
     and (p_status = 'failed'
          or array_position(array['queued', 'sent', 'delivered', 'read'], p_status)
             > coalesce(array_position(array['queued', 'sent', 'delivered', 'read'], m.status), 0));
end;
$$;

revoke all on function public.whatsapp_set_secret(text, text, text) from public, anon;
revoke all on function public.whatsapp_secret_status() from public, anon;
grant execute on function public.whatsapp_set_secret(text, text, text) to authenticated;
grant execute on function public.whatsapp_secret_status() to authenticated;

revoke all on function public.whatsapp_runtime(text) from public;
revoke all on function public.whatsapp_log_inbound(text, text, text, text, text, text) from public;
revoke all on function public.whatsapp_log_outbound(text, text, text, text, text, text, uuid) from public;
revoke all on function public.whatsapp_log_finish(text, uuid, text, text, text) from public;
revoke all on function public.whatsapp_status_update(text, text, text, text) from public;
grant execute on function public.whatsapp_runtime(text) to anon, authenticated;
grant execute on function public.whatsapp_log_inbound(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.whatsapp_log_outbound(text, text, text, text, text, text, uuid) to anon, authenticated;
grant execute on function public.whatsapp_log_finish(text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.whatsapp_status_update(text, text, text, text) to anon, authenticated;
