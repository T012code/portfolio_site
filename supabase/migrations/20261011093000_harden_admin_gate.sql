-- Move the admin check out of the exposed API schema (private.is_admin),
-- and split read policies by role so anon never evaluates the admin check
-- and no role has two permissive policies for the same action.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

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
     );
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- Always-readable tables: anon reads everything, the admin (authenticated) gets full access.
-- Signups are disabled, so the only authenticated user is the admin.
do $$
declare t text;
begin
  foreach t in array array['site_settings','page_blocks','process_steps']
  loop
    execute format('alter policy %I on public.%I to anon using (true)', t || '_public_read', t);
    execute format('alter policy %I on public.%I to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
                   t || '_admin_write', t);
  end loop;

  foreach t in array array['projects','capabilities','services','experience','skills']
  loop
    execute format('alter policy %I on public.%I to anon using (published)', t || '_public_read', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select private.is_admin()))',
                   t || '_admin_select', t);
    execute format('alter policy %I on public.%I to authenticated with check ((select private.is_admin()))',
                   t || '_admin_insert', t);
    execute format('alter policy %I on public.%I to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
                   t || '_admin_update', t);
    execute format('alter policy %I on public.%I to authenticated using ((select private.is_admin()))',
                   t || '_admin_delete', t);
  end loop;

  foreach t in array array['media','enquiries','messages']
  loop
    execute format('alter policy %I on public.%I to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
                   t || '_admin_all', t);
  end loop;
end $$;

alter policy media_admin_select on storage.objects to authenticated
  using (bucket_id = 'media' and (select private.is_admin()));
alter policy media_admin_insert on storage.objects to authenticated
  with check (bucket_id = 'media' and (select private.is_admin()));
alter policy media_admin_update on storage.objects to authenticated
  using (bucket_id = 'media' and (select private.is_admin()))
  with check (bucket_id = 'media' and (select private.is_admin()));
alter policy media_admin_delete on storage.objects to authenticated
  using (bucket_id = 'media' and (select private.is_admin()));

-- The old public helper is no longer referenced; make it uncallable through the API.
revoke execute on function public.is_admin() from anon, authenticated;

-- Lets the admin UI ask whether the current session passes the gate.
create or replace function public.am_i_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.is_admin();
$$;
revoke all on function public.am_i_admin() from public;
grant execute on function public.am_i_admin() to authenticated;
