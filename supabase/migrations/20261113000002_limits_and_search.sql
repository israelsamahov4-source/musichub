-- =====================================================================
-- 1. Searchable list of musical roles (for the Discover filter)
-- 2. Anti-abuse rate limits on everything users can create
-- 3. Instructors may mark a course as Pro-only (requires Pro/Premium to enroll)
-- =====================================================================

-- 1 ---------------------------------------------------------------------
create or replace function public.roles_of(j jsonb)
returns text[] language sql immutable as $$
  select coalesce(array_agg(x ->> 'role'), '{}') from jsonb_array_elements(coalesce(j, '[]')) x
$$;
grant execute on function public.roles_of(jsonb) to anon, authenticated;

alter table public.profiles
  add column role_list text[] generated always as (public.roles_of(musical_roles)) stored;
create index profiles_role_list on public.profiles using gin (role_list);
grant select (role_list) on public.profiles to anon, authenticated;

-- 2 ---------------------------------------------------------------------
-- Generic limiter: raises 'slow down' when a user created too many rows recently.
create or replace function public.enforce_rate_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner_col text := tg_argv[0];
  max_rows int := tg_argv[1]::int;
  win interval := tg_argv[2]::interval;
  owner_id uuid;
  recent int;
begin
  if coalesce(nullif(auth.role(), ''), 'none') in ('service_role', 'none') then return new; end if;
  owner_id := (to_jsonb(new) ->> owner_col)::uuid;
  execute format('select count(*) from %I.%I where %I = $1 and created_at > now() - $2',
                 tg_table_schema, tg_table_name, owner_col)
    into recent using owner_id, win;
  if recent >= max_rows then
    raise exception 'slow down: rate limit exceeded' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger rl_posts before insert on public.posts
  for each row execute function public.enforce_rate_limit('author_id', '20', '1 hour');
create trigger rl_comments before insert on public.post_comments
  for each row execute function public.enforce_rate_limit('author_id', '60', '1 hour');
create trigger rl_messages before insert on public.messages
  for each row execute function public.enforce_rate_limit('sender_id', '30', '1 minute');
create trigger rl_follows before insert on public.follows
  for each row execute function public.enforce_rate_limit('follower_id', '100', '1 hour');
create trigger rl_likes before insert on public.post_likes
  for each row execute function public.enforce_rate_limit('user_id', '300', '1 hour');
create trigger rl_projects before insert on public.collab_projects
  for each row execute function public.enforce_rate_limit('owner_id', '10', '1 day');
create trigger rl_collab_members before insert on public.collab_members
  for each row execute function public.enforce_rate_limit('user_id', '30', '1 day');
create trigger rl_reports before insert on public.reports
  for each row execute function public.enforce_rate_limit('reporter_id', '20', '1 day');
create trigger rl_courses before insert on public.courses
  for each row execute function public.enforce_rate_limit('instructor_id', '10', '1 day');

-- Limit how many new conversations a user can open per day (anti-spam DMs)
create or replace function public.start_conversation(other_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  cid uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if other_user is null or other_user = me then raise exception 'invalid recipient'; end if;
  if not exists (select 1 from public.profiles where id = other_user) then
    raise exception 'user not found';
  end if;
  if public.is_blocked_between(me, other_user) then raise exception 'blocked'; end if;

  select a.conversation_id into cid
  from public.conversation_members a
  join public.conversation_members b on b.conversation_id = a.conversation_id and b.user_id = other_user
  where a.user_id = me
    and (select count(*) from public.conversation_members c where c.conversation_id = a.conversation_id) = 2
  limit 1;

  if cid is null then
    if (select count(*) from public.conversation_members m
        join public.conversations c on c.id = m.conversation_id
        where m.user_id = me and c.created_at > now() - interval '1 day') >= 30 then
      raise exception 'slow down: too many new conversations today';
    end if;
    insert into public.conversations default values returning id into cid;
    insert into public.conversation_members (conversation_id, user_id) values (cid, me), (cid, other_user);
  end if;
  return cid;
end $$;

-- 3 ---------------------------------------------------------------------
grant update (is_free) on public.courses to authenticated;
drop policy courses_insert on public.courses;
create policy courses_insert on public.courses for insert to authenticated
  with check (instructor_id = auth.uid() and public.can_teach());
-- Only Premium instructors (or admins / approved instructors) can make a course Pro-only
create or replace function public.trg_courses_paid_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(nullif(auth.role(), ''), 'none') in ('service_role', 'none') then return new; end if;
  if not new.is_free and (tg_op = 'INSERT' or old.is_free) and not public.can_teach() then
    raise exception 'not allowed';
  end if;
  return new;
end $$;
create trigger courses_paid_guard before insert or update on public.courses
  for each row execute function public.trg_courses_paid_guard();

-- Indexes that keep the rate-limit checks fast
create index if not exists post_comments_author_created on public.post_comments (author_id, created_at);
create index if not exists messages_sender_created on public.messages (sender_id, created_at);
create index if not exists post_likes_user_created on public.post_likes (user_id, created_at);
create index if not exists follows_follower_created on public.follows (follower_id, created_at);
create index if not exists collab_projects_owner_created on public.collab_projects (owner_id, created_at);
