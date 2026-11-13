-- =====================================================================
-- 1. Privacy: visitors without an account see only a minimal profile card;
--    nobody can see who is an admin; the follow graph is members-only.
-- 2. Moderation: admins review reports, remove content, suspend accounts.
-- 3. Billing: provider-neutral subscription columns (Paddle).
-- =====================================================================

-- 1 -------------------------------------------------------------------
revoke select on public.profiles from anon, authenticated;
grant select (id, username, full_name, avatar_url, cover_url, user_type, instruments, genres,
  musical_roles, role_list, plan_tier, is_instructor, onboarding_completed, created_at)
  on public.profiles to anon;
grant select (id, username, full_name, avatar_url, cover_url, bio, location, user_type, instruments, genres,
  musical_roles, role_list, looking_for, open_for_collaboration, links, onboarding_completed,
  plan_tier, is_instructor, created_at, updated_at)
  on public.profiles to authenticated;

revoke select on public.follows from anon;
drop policy follows_read on public.follows;
create policy follows_read on public.follows for select to authenticated using (true);

-- 2 -------------------------------------------------------------------
alter table public.profiles add column is_suspended boolean not null default false;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;
grant execute on function public.is_admin() to authenticated;

-- Suspended accounts can read but not create anything
create or replace function public.block_suspended()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(nullif(auth.role(), ''), 'none') in ('service_role', 'none') then return new; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and is_suspended) then
    raise exception 'account suspended';
  end if;
  return new;
end $$;
create trigger suspended_posts before insert on public.posts for each row execute function public.block_suspended();
create trigger suspended_comments before insert on public.post_comments for each row execute function public.block_suspended();
create trigger suspended_messages before insert on public.messages for each row execute function public.block_suspended();
create trigger suspended_projects before insert on public.collab_projects for each row execute function public.block_suspended();
create trigger suspended_members before insert on public.collab_members for each row execute function public.block_suspended();
create trigger suspended_courses before insert on public.courses for each row execute function public.block_suspended();
create trigger suspended_follows before insert on public.follows for each row execute function public.block_suspended();

-- Admins can read and close reports
grant update (status) on public.reports to authenticated;
create policy reports_admin_read on public.reports for select to authenticated using (public.is_admin());
create policy reports_admin_update on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Open reports with a short, privacy-preserving summary of what was reported.
-- For a reported private message, the admin sees only that one message.
create or replace function public.admin_reports(p_status text default 'open')
returns table (
  id uuid, created_at timestamptz, status text, reason text, target_type text, target_id uuid,
  reporter_username text, target_owner_id uuid, target_owner_username text, target_text text, target_link text
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  select r.id, r.created_at, r.status, r.reason, r.target_type, r.target_id, rp.username,
    t.owner_id, op.username, left(t.body, 600), t.link
  from public.reports r
  join public.profiles rp on rp.id = r.reporter_id
  left join lateral (
    select p.author_id as owner_id, p.content as body, '/posts/' || p.id as link from public.posts p
      where r.target_type = 'post' and p.id = r.target_id
    union all
    select c.author_id, c.content, '/posts/' || c.post_id from public.post_comments c
      where r.target_type = 'comment' and c.id = r.target_id
    union all
    select m.sender_id, m.content, null from public.messages m
      where r.target_type = 'message' and m.id = r.target_id
    union all
    select pr.id, coalesce(nullif(pr.bio, ''), pr.full_name), '/u/' || pr.username from public.profiles pr
      where r.target_type = 'profile' and pr.id = r.target_id
    union all
    select cp.owner_id, cp.title || E'\n' || cp.description, '/collabs/' || cp.id from public.collab_projects cp
      where r.target_type = 'project' and cp.id = r.target_id
    union all
    select co.instructor_id, co.title || E'\n' || co.description, '/courses/' || co.id from public.courses co
      where r.target_type = 'course' and co.id = r.target_id
  ) t on true
  left join public.profiles op on op.id = t.owner_id
  where p_status = 'all' or r.status = p_status
  order by r.created_at desc
  limit 200;
end $$;
grant execute on function public.admin_reports(text) to authenticated;

-- Remove the reported content (or suspend the reported profile) and close the report
create or replace function public.admin_remove_reported(p_report uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select * into r from public.reports where id = p_report;
  if r is null then raise exception 'report not found'; end if;
  case r.target_type
    when 'post' then delete from public.posts where id = r.target_id;
    when 'comment' then delete from public.post_comments where id = r.target_id;
    when 'message' then delete from public.messages where id = r.target_id;
    when 'project' then delete from public.collab_projects where id = r.target_id;
    when 'course' then update public.courses set is_published = false where id = r.target_id;
    when 'profile' then update public.profiles set is_suspended = true where id = r.target_id and not is_admin;
  end case;
  update public.reports set status = 'reviewed' where target_type = r.target_type and target_id = r.target_id;
end $$;
grant execute on function public.admin_remove_reported(uuid) to authenticated;

create or replace function public.admin_set_flags(p_user uuid, p_suspended boolean default null, p_instructor boolean default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_user = auth.uid() and p_suspended then raise exception 'cannot suspend yourself'; end if;
  update public.profiles set
    is_suspended = coalesce(p_suspended, is_suspended),
    is_instructor = coalesce(p_instructor, is_instructor)
  where id = p_user and (not is_admin or p_suspended is not true);
end $$;
grant execute on function public.admin_set_flags(uuid, boolean, boolean) to authenticated;

create or replace function public.admin_find_users(p_query text)
returns table (id uuid, username text, full_name text, avatar_url text, created_at timestamptz,
  is_instructor boolean, is_suspended boolean, plan_tier text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  select p.id, p.username, p.full_name, p.avatar_url, p.created_at, p.is_instructor, p.is_suspended, p.plan_tier
  from public.profiles p
  where coalesce(p_query, '') = '' or p.username ilike '%' || p_query || '%' or p.full_name ilike '%' || p_query || '%'
  order by p.created_at desc limit 50;
end $$;
grant execute on function public.admin_find_users(text) to authenticated;

create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'posts', (select count(*) from public.posts),
    'projects', (select count(*) from public.collab_projects),
    'courses', (select count(*) from public.courses where is_published),
    'paying', (select count(*) from public.subscriptions where tier <> 'free' and status in ('active', 'trialing', 'past_due')),
    'open_reports', (select count(*) from public.reports where status = 'open')
  );
end $$;
grant execute on function public.admin_stats() to authenticated;

-- Own account flags (is_admin / is_suspended are not readable through the profiles table)
create or replace function public.my_account()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('is_admin', is_admin, 'is_suspended', is_suspended)
  from public.profiles where id = auth.uid()
$$;
grant execute on function public.my_account() to authenticated;

-- 3 -------------------------------------------------------------------
alter table public.subscriptions
  add column provider text check (provider in ('paddle', 'stripe')),
  add column provider_customer_id text unique,
  add column provider_subscription_id text unique;

-- New functions default to EXECUTE for PUBLIC; keep the rule "only what we grant"
revoke execute on function public.is_admin(), public.block_suspended(), public.admin_reports(text),
  public.admin_remove_reported(uuid), public.admin_set_flags(uuid, boolean, boolean),
  public.admin_find_users(text), public.admin_stats(), public.my_account() from public, anon;
grant execute on function public.is_admin(), public.admin_reports(text), public.admin_remove_reported(uuid),
  public.admin_set_flags(uuid, boolean, boolean), public.admin_find_users(text), public.admin_stats(),
  public.my_account() to authenticated;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;
