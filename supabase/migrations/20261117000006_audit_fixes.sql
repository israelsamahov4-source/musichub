-- Fixes from the November 2026 audit (docs: startup folder 08, SEC-* / CODE-* ids).
-- Safe to run once on top of migrations 1-5.

-- SEC-1: two-step verification must also hold inside functions that bypass RLS.
-- Admin RPCs all start with is_admin(), so they inherit the check.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.mfa_ok() and coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.my_account()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('is_admin', is_admin, 'is_suspended', is_suspended)
  from public.profiles where id = auth.uid() and public.mfa_ok()
$$;

create or replace function public.my_conversations()
returns table (
  conversation_id uuid,
  last_message_at timestamptz,
  other_id uuid,
  other_username text,
  other_full_name text,
  other_avatar_url text,
  last_message text,
  last_sender_id uuid,
  unread_count bigint
) language sql stable security definer set search_path = '' as $$
  select
    c.id,
    c.last_message_at,
    p.id, p.username, p.full_name, p.avatar_url,
    lm.content, lm.sender_id,
    (select count(*) from public.messages m
      where m.conversation_id = c.id and m.sender_id <> auth.uid() and m.created_at > me.last_read_at)
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  join public.conversation_members om on om.conversation_id = c.id and om.user_id <> me.user_id
  join public.profiles p on p.id = om.user_id
  left join lateral (
    select m.content, m.sender_id from public.messages m
    where m.conversation_id = c.id order by m.created_at desc limit 1
  ) lm on true
  where me.user_id = auth.uid() and public.mfa_ok()
  order by c.last_message_at desc
$$;

-- SEC-6 (second part): only conversations I opened count towards my daily limit.
alter table public.conversations add column if not exists created_by uuid default auth.uid()
  references public.profiles (id) on delete set null;

create or replace function public.start_conversation(other_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  cid uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if not public.mfa_ok() then raise exception 'mfa required' using errcode = '42501'; end if;
  if exists (select 1 from public.profiles where id = me and is_suspended) then
    raise exception 'account suspended';
  end if;
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
    if (select count(*) from public.conversations c
        where c.created_by = me and c.created_at > now() - interval '1 day') >= 30 then
      raise exception 'slow down: too many new conversations today';
    end if;
    insert into public.conversations (created_by) values (me) returning id into cid;
    insert into public.conversation_members (conversation_id, user_id) values (cid, me), (cid, other_user);
  end if;
  return cid;
end $$;

-- SEC-4: "applications" visibility counts only relationships the CV owner took part in.
create or replace function public.has_relationship_with(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and public.mfa_ok() and (
    -- target asked to join, or is active in, a project I own (my invitation alone does not count)
    exists (
      select 1 from public.collab_members m
      join public.collab_projects p on p.id = m.project_id
      where m.user_id = target and p.owner_id = auth.uid() and m.status in ('requested', 'active')
    )
    -- I asked to join / was invited to / am in a project target owns
    or exists (
      select 1 from public.collab_members m
      join public.collab_projects p on p.id = m.project_id
      where m.user_id = auth.uid() and p.owner_id = target
    )
    -- we are active teammates
    or exists (
      select 1 from public.collab_members a
      join public.collab_members b on b.project_id = a.project_id
      where a.user_id = target and a.status = 'active'
        and b.user_id = auth.uid() and b.status = 'active'
    )
    -- target wrote to me in a conversation we share
    or exists (
      select 1 from public.conversation_members b
      join public.messages m on m.conversation_id = b.conversation_id and m.sender_id = target
      where b.user_id = auth.uid()
    )
  )
$$;

-- SEC-3: the server, not the client, decides when a row was created.
-- (Rate limits count recent rows; a back-dated row was never counted.)
create or replace function public.set_server_time()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['posts', 'post_comments', 'messages', 'follows', 'post_likes', 'collab_projects',
    'collab_members', 'collab_tasks', 'reports', 'courses', 'lessons', 'enrollments', 'blocks', 'conversations']
  loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = t and column_name = 'created_at') then
      execute format('drop trigger if exists aa_server_time on public.%I', t);
      execute format('create trigger aa_server_time before insert on public.%I
                      for each row execute function public.set_server_time()', t);
    end if;
  end loop;
end $$;

create or replace function public.set_lesson_done_time()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.completed_at := now();
  return new;
end $$;
drop trigger if exists aa_server_time on public.lesson_progress;
create trigger aa_server_time before insert on public.lesson_progress
  for each row execute function public.set_lesson_done_time();

-- CODE-18: read markers use the server clock too.
create or replace function public.set_read_time()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'conversation_members' then
    if new.last_read_at is distinct from old.last_read_at then new.last_read_at := now(); end if;
  elsif new.read_at is distinct from old.read_at and new.read_at is not null then
    new.read_at := now();
  end if;
  return new;
end $$;
drop trigger if exists aa_read_time on public.conversation_members;
create trigger aa_read_time before update on public.conversation_members
  for each row execute function public.set_read_time();
drop trigger if exists aa_read_time on public.notifications;
create trigger aa_read_time before update on public.notifications
  for each row execute function public.set_read_time();

-- SEC-5 / CODE-13: pending requests and their notes are for the owner and the applicant only.
drop policy if exists members_read on public.collab_members;
create policy members_read on public.collab_members for select using (
  (status = 'active' and public.can_view_project(project_id))
  or user_id = auth.uid()
  or public.is_project_owner(project_id)
);

-- SEC-6: limit invitations by the person sending them, requests by the person asking.
drop trigger if exists rl_collab_members on public.collab_members;
create or replace function public.rl_collab_members()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(nullif(auth.role(), ''), 'none') in ('service_role', 'none') then return new; end if;
  if new.status = 'invited' then
    if (select count(*) from public.collab_members m
        join public.collab_projects p on p.id = m.project_id
        where p.owner_id = auth.uid() and m.status = 'invited'
          and m.created_at > now() - interval '1 day') >= 30 then
      raise exception 'slow down: rate limit exceeded' using errcode = 'P0001';
    end if;
  elsif new.status = 'requested' then
    if (select count(*) from public.collab_members
        where user_id = auth.uid() and status = 'requested'
          and created_at > now() - interval '1 day') >= 30 then
      raise exception 'slow down: rate limit exceeded' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger rl_collab_members before insert on public.collab_members
  for each row execute function public.rl_collab_members();

-- SEC-13: a blocked user cannot reach the blocker through a join request.
create or replace function public.trg_collab_members_no_blocked_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'requested' and exists (
    select 1 from public.collab_projects p
    where p.id = new.project_id and public.is_blocked_between(p.owner_id, new.user_id)
  ) then
    raise exception 'blocked';
  end if;
  return new;
end $$;
drop trigger if exists collab_members_no_blocked on public.collab_members;
create trigger collab_members_no_blocked before insert on public.collab_members
  for each row execute function public.trg_collab_members_no_blocked_request();

-- CODE-9: when someone leaves a project, their tasks become unassigned (so they can still be edited).
create or replace function public.trg_unassign_departed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.collab_tasks set assignee_id = null
  where project_id = old.project_id and assignee_id = old.user_id;
  return old;
end $$;
drop trigger if exists collab_members_unassign on public.collab_members;
create trigger collab_members_unassign after delete on public.collab_members
  for each row execute function public.trg_unassign_departed();

-- SEC-8: a suspended account cannot change content either (viewing and marking things read still work).
do $$
declare spec text[];
begin
  foreach spec slice 1 in array array[
    ['posts', 'update'], ['post_comments', 'update'], ['post_likes', 'insert'], ['reports', 'insert'],
    ['collab_projects', 'update'], ['collab_members', 'update'], ['collab_tasks', 'insert or update'],
    ['courses', 'update'], ['lessons', 'insert or update'], ['profiles', 'update'],
    ['profile_details', 'update'], ['blocks', 'insert']]
  loop
    execute format('drop trigger if exists suspended_%s_w on public.%I', spec[1], spec[1]);
    execute format('create trigger suspended_%s_w before %s on public.%I for each row execute function public.block_suspended()',
                   spec[1], spec[2], spec[1]);
  end loop;
end $$;

-- SEC-9: following, unfollowing and following again does not notify again within a day.
create or replace function public.trg_notify_follow() returns trigger
language plpgsql security definer set search_path = '' as $$
declare uname text;
begin
  if exists (select 1 from public.notifications
             where user_id = new.following_id and actor_id = new.follower_id and type = 'follow'
               and created_at > now() - interval '1 day') then
    return new;
  end if;
  select username into uname from public.profiles where id = new.follower_id;
  perform public.notify(new.following_id, new.follower_id, 'follow', new.follower_id,
    'התחיל/ה לעקוב אחריך', '/u/' || uname);
  return new;
end $$;

-- SEC-11: a new account's public handle no longer reveals the e-mail address.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  candidate text;
  wanted text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  n int := 0;
begin
  if wanted ~ '^[a-z0-9_]{3,30}$'
     and not exists (select 1 from public.profiles where username = wanted) then
    candidate := wanted;
  else
    candidate := 'user_' || left(replace(new.id::text, '-', ''), 8);
    while exists (select 1 from public.profiles where username = candidate) loop
      n := n + 1;
      candidate := 'user_' || substr(md5(new.id::text || n::text), 1, 10);
      exit when n > 20;
    end loop;
  end if;

  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    candidate,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 80),
    case when public.is_http_url(new.raw_user_meta_data ->> 'avatar_url')
         then new.raw_user_meta_data ->> 'avatar_url' end
  );
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end $$;

-- SEC-12 / CODE-11: paid lessons need a paid plan at the time of watching, not only when enrolling.
create or replace function public.can_watch(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_enrolled(cid) and exists (
    select 1 from public.courses c
    where c.id = cid and (c.is_free or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.plan_tier in ('pro', 'premium')))
  )
$$;
revoke execute on function public.can_watch(uuid) from public;
grant execute on function public.can_watch(uuid) to anon, authenticated;

drop policy if exists lessons_read on public.lessons;
create policy lessons_read on public.lessons for select
  using (
    public.is_course_instructor(course_id)
    or (exists (select 1 from public.courses c where c.id = course_id and c.is_published)
        and (is_preview or public.can_watch(course_id)))
  );

-- SEC-7: every musical role must be {"role": text, "level": text}; one bad value used to crash Discover.
create or replace function public.valid_roles(v jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(v) = 'array'
    and jsonb_array_length(v) <= 10
    and not exists (
      select 1 from jsonb_array_elements(v) e
      where jsonb_typeof(e) <> 'object'
         or jsonb_typeof(e -> 'role') is distinct from 'string'
         or length(e ->> 'role') not between 1 and 40
         or (e ? 'level' and jsonb_typeof(e -> 'level') <> 'null'
             and (jsonb_typeof(e -> 'level') <> 'string' or length(e ->> 'level') > 20))
    )
$$;
alter table public.profiles drop constraint if exists musical_roles_shape;
alter table public.profiles add constraint musical_roles_shape check (public.valid_roles(musical_roles)) not valid;

-- SEC-15: no huge values hidden inside lists and JSON fields.
alter table public.profiles drop constraint if exists profiles_sizes;
alter table public.profiles add constraint profiles_sizes check (
  octet_length(instruments::text) <= 2000 and octet_length(genres::text) <= 2000
  and octet_length(looking_for::text) <= 1000 and octet_length(musical_roles::text) <= 2000
  and octet_length(links::text) <= 3000) not valid;
alter table public.profile_details drop constraint if exists details_sizes;
alter table public.profile_details add constraint details_sizes check (
  octet_length(skills::text) <= 3000 and octet_length(languages::text) <= 1000
  and octet_length(open_to::text) <= 1000 and octet_length(experience::text) <= 30000
  and octet_length(education::text) <= 10000 and octet_length(portfolio::text) <= 10000) not valid;
alter table public.posts drop constraint if exists posts_sizes;
alter table public.posts add constraint posts_sizes check (octet_length(genres::text) <= 1000) not valid;
alter table public.collab_projects drop constraint if exists projects_sizes;
alter table public.collab_projects add constraint projects_sizes check (
  octet_length(genres::text) <= 1000 and octet_length(looking_for_roles::text) <= 1500) not valid;
alter table public.courses drop constraint if exists courses_sizes;
alter table public.courses add constraint courses_sizes check (octet_length(what_you_learn::text) <= 5000) not valid;

-- Permissions for the new helper functions.
revoke execute on function public.set_server_time(), public.set_lesson_done_time(), public.set_read_time(),
  public.rl_collab_members(), public.trg_collab_members_no_blocked_request(), public.trg_unassign_departed()
  from public, anon, authenticated;
revoke execute on function public.valid_roles(jsonb) from public;
grant execute on function public.valid_roles(jsonb) to anon, authenticated;
grant execute on all functions in schema public to service_role;
