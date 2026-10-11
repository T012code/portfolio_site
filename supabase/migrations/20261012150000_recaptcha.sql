-- Google reCAPTCHA v3 on the contact forms, managed from Admin → Spam protection.
-- The site key and switch are public (the browser needs them); the secret key is encrypted by
-- the web server (MAIL_SECRET) and kept in the private schema next to the SMTP password.
alter table public.site_settings
  add column if not exists recaptcha_enabled boolean not null default false,
  add column if not exists recaptcha_site_key text not null default '' check (char_length(recaptcha_site_key) <= 100),
  add column if not exists recaptcha_min_score real not null default 0.5 check (recaptcha_min_score between 0.1 and 0.9);

alter table private.mail_secret add column if not exists recaptcha_secret_enc text;

create or replace function public.recaptcha_set_secret(p_secret_enc text, p_gate_hash text)
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
         recaptcha_secret_enc = case when p_secret_enc is null then recaptcha_secret_enc
                                     when p_secret_enc = '' then null
                                     else p_secret_enc end,
         updated_at = now()
   where id;
end;
$$;

create or replace function public.recaptcha_secret_set()
returns boolean language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return (select s.recaptcha_secret_enc is not null from private.mail_secret s where s.id);
end;
$$;

-- For the web server only (gated like the mail functions).
create or replace function public.recaptcha_runtime(p_gate text)
returns text language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.mail_gate_ok(p_gate) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return (select s.recaptcha_secret_enc from private.mail_secret s where s.id);
end;
$$;

revoke all on function public.recaptcha_set_secret(text, text) from public, anon;
revoke all on function public.recaptcha_secret_set() from public, anon;
revoke all on function public.recaptcha_runtime(text) from public;
grant execute on function public.recaptcha_set_secret(text, text) to authenticated;
grant execute on function public.recaptcha_secret_set() to authenticated;
grant execute on function public.recaptcha_runtime(text) to anon, authenticated;
