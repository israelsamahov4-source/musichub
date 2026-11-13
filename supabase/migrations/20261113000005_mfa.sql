-- =====================================================================
-- Two-step verification (TOTP) enforced by the database, not just the UI.
-- A user who turned it on gets no data at all until their session is
-- upgraded to aal2 (password + authenticator code). Users without it
-- are unaffected.
-- =====================================================================
create or replace function public.mfa_ok()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is null
      or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors where user_id = auth.uid() and status = 'verified')
$$;
revoke execute on function public.mfa_ok() from public;
grant execute on function public.mfa_ok() to anon, authenticated;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format(
      'create policy mfa_required on public.%I as restrictive to authenticated using (public.mfa_ok()) with check (public.mfa_ok())', t);
  end loop;
end $$;

create policy mfa_required on storage.objects as restrictive to authenticated
  using (public.mfa_ok()) with check (public.mfa_ok());
