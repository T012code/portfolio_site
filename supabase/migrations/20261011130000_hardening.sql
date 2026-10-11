-- Review fixes: seed the settings row, make rate limits atomic and harder to abuse,
-- and reorder lists in one statement.

-- A fresh database must still serve the site.
insert into public.site_settings (id) values (true) on conflict (id) do nothing;

-- Submissions: serialise per email (advisory lock) so concurrent requests can't
-- slip past the per-email limit, and raise the global ceiling so one sender can't
-- lock genuine visitors out.
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

  perform pg_advisory_xact_lock(hashtext('enquiry:' || v_email));
  if (select count(*) from public.enquiries
      where email = v_email and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from public.enquiries
         where created_at > now() - interval '10 minutes') >= 60 then
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

  perform pg_advisory_xact_lock(hashtext('message:' || v_email));
  if (select count(*) from public.messages
      where email = v_email and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.messages
         where created_at > now() - interval '10 minutes') >= 90 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.messages (name, email, whatsapp, message)
  values (trim(p_name), v_email, trim(coalesce(p_whatsapp, '')), trim(p_message))
  returning id into v_id;
  return v_id;
end;
$$;

-- Reorder a list in one statement. Runs as the caller, so row-level security still
-- decides whether the update is allowed; the table name is checked against a whitelist.
create or replace function public.reorder_rows(p_table text, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_table not in ('projects', 'services', 'capabilities', 'process_steps', 'skills') then
    raise exception 'invalid_table' using errcode = '22023';
  end if;
  execute format(
    'update public.%I t set sort = o.ord from unnest($1) with ordinality as o(id, ord) where t.id = o.id',
    p_table
  ) using p_ids;
end;
$$;

revoke all on function public.reorder_rows(text, uuid[]) from public;
grant execute on function public.reorder_rows(text, uuid[]) to authenticated;
