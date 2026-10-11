-- Email log: keep each email's content for preview and resend, and a retention setting.
alter table public.mail_settings
  add column log_retention_days integer not null default 90
    check (log_retention_days in (0, 7, 30, 90, 180, 365)),
  add column log_store_content boolean not null default true;

alter table public.mail_log
  add column body_text text check (char_length(body_text) <= 100000),
  add column body_html text check (char_length(body_html) <= 300000),
  add column reply_to text check (char_length(reply_to) <= 254),
  add column resent_from uuid;

create policy mail_log_admin_delete on public.mail_log for delete to authenticated
  using ((select private.is_admin()));

-- Same as mail_log_begin, plus the email content (stored only when the setting allows) and,
-- for a resend, the entry it repeats. Old entries are pruned from the dashboard by retention.
create or replace function public.mail_log_open(
  p_gate text, p_kind text, p_to text, p_subject text, p_ref_type text, p_ref_id uuid,
  p_text text default null, p_html text default null, p_reply_to text default null, p_resent_from uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_to text := lower(trim(coalesce(p_to, '')));
  v_store boolean;
  v_reason text;
  v_id uuid;
begin
  if not private.mail_gate_ok(p_gate) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Limits protect the contact form; a resend is a deliberate admin action.
  if p_kind = 'autoreply' and p_resent_from is null then
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

  select log_store_content into v_store from public.mail_settings where id;

  insert into public.mail_log (kind, to_email, subject, status, detail, ref_type, ref_id,
                               body_text, body_html, reply_to, resent_from)
  values (p_kind, v_to, left(coalesce(p_subject, ''), 300),
          case when v_reason is null then 'queued' else 'skipped' end,
          coalesce(v_reason, ''), p_ref_type, p_ref_id,
          case when coalesce(v_store, true) then left(p_text, 100000) end,
          case when coalesce(v_store, true) then left(p_html, 300000) end,
          left(p_reply_to, 254), p_resent_from)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'allowed', v_reason is null);
end;
$$;

revoke all on function public.mail_log_open(text, text, text, text, text, uuid, text, text, text, uuid) from public;
grant execute on function public.mail_log_open(text, text, text, text, text, uuid, text, text, text, uuid) to anon, authenticated;

-- Admin: how much the log holds.
create or replace function public.mail_log_stats()
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
  return (
    select jsonb_build_object(
      'entries', count(*),
      'with_content', count(*) filter (where body_text is not null or body_html is not null),
      'content_bytes', coalesce(sum(coalesce(octet_length(body_text), 0) + coalesce(octet_length(body_html), 0)), 0),
      'table_bytes', pg_total_relation_size('public.mail_log'),
      'oldest', min(created_at)
    )
    from public.mail_log
  );
end;
$$;

revoke all on function public.mail_log_stats() from public, anon;
grant execute on function public.mail_log_stats() to authenticated;

-- Admins may clear stored content (keeping the entry); nothing else in a log row is editable.
create policy mail_log_admin_update on public.mail_log for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
revoke update on public.mail_log from authenticated;
grant update (body_text, body_html) on public.mail_log to authenticated;
