-- Supabase grants EXECUTE on new public functions to anon by default; admin helpers
-- are for signed-in sessions only (row-level security already blocks their effect).
revoke execute on function public.reorder_rows(text, uuid[]) from anon;
revoke execute on function public.am_i_admin() from anon;
