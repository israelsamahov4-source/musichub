-- =====================================================================
-- MusicHub — initial schema
-- Security model: every table has Row Level Security enabled.
-- Clients (roles anon / authenticated) only get the privileges granted
-- explicitly below; sensitive columns (plan, instructor/admin flags,
-- billing ids) can only be changed by the server (service_role).
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.is_http_url(u text)
returns boolean language sql immutable as $$
  select u is null or u = '' or (u ~* '^https?://[^\s<>"]+$' and length(u) <= 2048)
$$;

create or replace function public.valid_links(j jsonb)
returns boolean language sql immutable as $$
  select j is null or (
    jsonb_typeof(j) = 'object'
    and not exists (
      select 1 from jsonb_each(j) e
      where jsonb_typeof(e.value) <> 'string' or not public.is_http_url(e.value #>> '{}')
    )
  )
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  full_name text not null default '' check (length(full_name) <= 80),
  avatar_url text check (public.is_http_url(avatar_url)),
  cover_url text check (public.is_http_url(cover_url)),
  bio text not null default '' check (length(bio) <= 1000),
  location text not null default '' check (length(location) <= 100),
  user_type text not null default 'musician' check (user_type in ('musician', 'listener')),
  instruments text[] not null default '{}' check (cardinality(instruments) <= 20),
  genres text[] not null default '{}' check (cardinality(genres) <= 20),
  -- [{ "role": "guitarist", "level": "advanced" }]
  musical_roles jsonb not null default '[]' check (jsonb_typeof(musical_roles) = 'array' and jsonb_array_length(musical_roles) <= 10),
  looking_for text[] not null default '{}' check (cardinality(looking_for) <= 10),
  open_for_collaboration boolean not null default true,
  -- { "website": "https://…", "instagram": "https://…", … }
  links jsonb not null default '{}' check (public.valid_links(links)),
  onboarding_completed boolean not null default false,
  -- server-controlled
  plan_tier text not null default 'free' check (plan_tier in ('free', 'pro', 'premium')),
  is_instructor boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_name_trgm on public.profiles using gin ((full_name || ' ' || username) extensions.gin_trgm_ops);
create index profiles_instruments on public.profiles using gin (instruments);
create index profiles_genres on public.profiles using gin (genres);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Billing data is private to its owner and written only by the server.
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'pro', 'premium')),
  status text not null default 'active',
  billing_cycle text check (billing_cycle in ('monthly', 'yearly')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Create profile + subscription row on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  base text;
  candidate text;
  wanted text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  n int := 0;
begin
  if wanted ~ '^[a-z0-9_]{3,30}$'
     and not exists (select 1 from public.profiles where username = wanted) then
    candidate := wanted;
  else
    base := left(regexp_replace(lower(split_part(coalesce(new.email, 'user'), '@', 1)), '[^a-z0-9_]', '', 'g'), 20);
    if length(base) < 3 then base := 'user' || base; end if;
    candidate := base;
    while exists (select 1 from public.profiles where username = candidate) loop
      n := n + 1;
      candidate := base || (floor(random() * 9000) + 1000)::int::text;
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

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Safety: blocks & reports
-- ---------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('profile', 'post', 'comment', 'message', 'project', 'course')),
  target_id uuid not null,
  reason text not null check (length(reason) between 3 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Social graph & feed
-- ---------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following on public.follows (following_id);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null default '' check (length(content) <= 5000),
  media_url text check (public.is_http_url(media_url)),
  media_type text check (media_type in ('image', 'audio', 'video', 'link')),
  genres text[] not null default '{}' check (cardinality(genres) <= 10),
  collaboration_wanted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(content)) > 0 or media_url is not null)
);
create index posts_author_created on public.posts (author_id, created_at desc);
create index posts_created on public.posts (created_at desc);
create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_user on public.post_likes (user_id);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index post_comments_post on public.post_comments (post_id, created_at);

-- ---------------------------------------------------------------------
-- Direct messages
-- ---------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_members_user on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (length(btrim(content)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_conversation_created on public.messages (conversation_id, created_at);

create or replace function public.is_conversation_member(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = cid and user_id = auth.uid()
  )
$$;

create or replace function public.bump_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at
    where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end $$;
create trigger messages_bump after insert on public.messages
  for each row execute function public.bump_conversation();

-- Start (or reuse) a 1:1 conversation
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
    insert into public.conversations default values returning id into cid;
    insert into public.conversation_members (conversation_id, user_id) values (cid, me), (cid, other_user);
  end if;
  return cid;
end $$;

-- Inbox: one row per conversation with the other participant and unread count
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
  where me.user_id = auth.uid()
  order by c.last_message_at desc
$$;

-- ---------------------------------------------------------------------
-- Notifications (created only by server-side triggers)
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete cascade,
  type text not null check (type in (
    'follow', 'post_like', 'post_comment',
    'collab_request', 'collab_invite', 'collab_accepted',
    'subscription', 'system'
  )),
  entity_id uuid,
  message text not null default '' check (length(message) <= 500),
  link text check (link is null or link ~ '^/[A-Za-z0-9/_\-?=&.%]*$'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_created on public.notifications (user_id, created_at desc);

create or replace function public.notify(
  p_user uuid, p_actor uuid, p_type text, p_entity uuid, p_message text, p_link text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_user = p_actor then return; end if;
  if p_actor is not null and public.is_blocked_between(p_user, p_actor) then return; end if;
  insert into public.notifications (user_id, actor_id, type, entity_id, message, link)
  values (p_user, p_actor, p_type, p_entity, p_message, p_link);
end $$;
revoke execute on function public.notify(uuid, uuid, text, uuid, text, text) from public, anon, authenticated;

create or replace function public.trg_notify_follow() returns trigger
language plpgsql security definer set search_path = '' as $$
declare uname text;
begin
  select username into uname from public.profiles where id = new.follower_id;
  perform public.notify(new.following_id, new.follower_id, 'follow', new.follower_id,
    'התחיל/ה לעקוב אחריך', '/u/' || uname);
  return new;
end $$;
create trigger follows_notify after insert on public.follows
  for each row execute function public.trg_notify_follow();

create or replace function public.trg_notify_like() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify((select author_id from public.posts where id = new.post_id),
    new.user_id, 'post_like', new.post_id, 'אהב/ה את הפוסט שלך', '/posts/' || new.post_id);
  return new;
end $$;
create trigger post_likes_notify after insert on public.post_likes
  for each row execute function public.trg_notify_like();

create or replace function public.trg_notify_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify((select author_id from public.posts where id = new.post_id),
    new.author_id, 'post_comment', new.post_id, 'הגיב/ה על הפוסט שלך', '/posts/' || new.post_id);
  return new;
end $$;
create trigger post_comments_notify after insert on public.post_comments
  for each row execute function public.trg_notify_comment();

-- ---------------------------------------------------------------------
-- Collaboration projects
-- ---------------------------------------------------------------------
create table public.collab_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(btrim(title)) between 2 and 120),
  description text not null default '' check (length(description) <= 5000),
  type text not null default 'single' check (type in ('songwriting', 'album', 'single', 'jam', 'production', 'remix', 'band', 'other')),
  status text not null default 'planning' check (status in ('planning', 'in_progress', 'review', 'completed', 'on_hold')),
  genres text[] not null default '{}' check (cardinality(genres) <= 10),
  looking_for_roles text[] not null default '{}' check (cardinality(looking_for_roles) <= 15),
  location text not null default '' check (length(location) <= 100),
  is_remote boolean not null default true,
  is_public boolean not null default true,
  cover_url text check (public.is_http_url(cover_url)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index collab_projects_public_created on public.collab_projects (is_public, created_at desc);
create trigger collab_projects_updated_at before update on public.collab_projects
  for each row execute function public.set_updated_at();

create table public.collab_members (
  project_id uuid not null references public.collab_projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  instrument text not null default '' check (length(instrument) <= 60),
  status text not null check (status in ('active', 'requested', 'invited')),
  note text not null default '' check (length(note) <= 500),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index collab_members_user on public.collab_members (user_id);

create or replace function public.is_project_owner(pid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.collab_projects where id = pid and owner_id = auth.uid())
$$;

create or replace function public.is_project_member(pid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.collab_members
    where project_id = pid and user_id = auth.uid() and status = 'active'
  )
$$;

create or replace function public.can_view_project(pid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.collab_projects p
    where p.id = pid and (p.is_public or p.owner_id = auth.uid()
      or exists (select 1 from public.collab_members m where m.project_id = p.id and m.user_id = auth.uid()))
  )
$$;

-- Owner automatically becomes an active member
create or replace function public.trg_project_owner_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.collab_members (project_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'active');
  return new;
end $$;
create trigger collab_projects_owner_member after insert on public.collab_projects
  for each row execute function public.trg_project_owner_member();

-- Enforce membership state machine (RLS can't see OLD values)
create or replace function public.trg_collab_members_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  is_owner boolean;
  -- 'none' = direct database connection (migrations / dashboard), service_role = edge functions
  is_server boolean := coalesce(nullif(auth.role(), ''), 'none') in ('service_role', 'none');
begin
  if is_server then return coalesce(new, old); end if;
  is_owner := public.is_project_owner(coalesce(new.project_id, old.project_id));

  if tg_op = 'INSERT' then
    if new.role = 'owner' then
      -- only the automatic row created for the project's real owner
      if new.status = 'active' and new.user_id = auth.uid() and is_owner then return new; end if;
      raise exception 'cannot add owner';
    end if;
    if new.user_id = auth.uid() and not is_owner then
      if new.status <> 'requested' then raise exception 'members must request to join'; end if;
      if not exists (select 1 from public.collab_projects where id = new.project_id and is_public) then
        raise exception 'project is private';
      end if;
    elsif is_owner then
      if new.status <> 'invited' then raise exception 'owner can only invite'; end if;
      if public.is_blocked_between(auth.uid(), new.user_id) then raise exception 'blocked'; end if;
    else
      raise exception 'not allowed';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.role = 'owner' or new.role = 'owner' then raise exception 'owner row is immutable'; end if;
    if new.project_id <> old.project_id or new.user_id <> old.user_id then raise exception 'immutable keys'; end if;
    if is_owner then
      if not (old.status = 'requested' and new.status = 'active') and new.status <> old.status then
        raise exception 'invalid status change';
      end if;
    elsif old.user_id = auth.uid() then
      if not (old.status = 'invited' and new.status = 'active') then raise exception 'invalid status change'; end if;
      new.role := old.role;
    else
      raise exception 'not allowed';
    end if;
    return new;
  end if;

  -- DELETE (cascades from a deleted project/account are allowed)
  if old.role = 'owner' and exists (select 1 from public.collab_projects where id = old.project_id) then
    raise exception 'owner cannot leave; delete the project instead';
  end if;
  return old;
end $$;
create trigger collab_members_guard before insert or update or delete on public.collab_members
  for each row execute function public.trg_collab_members_guard();

create or replace function public.trg_collab_members_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  proj record;
begin
  select id, owner_id, title into proj from public.collab_projects where id = new.project_id;
  if tg_op = 'INSERT' and new.status = 'requested' then
    perform public.notify(proj.owner_id, new.user_id, 'collab_request', proj.id,
      'ביקש/ה להצטרף לפרויקט "' || left(proj.title, 60) || '"', '/collabs/' || proj.id);
  elsif tg_op = 'INSERT' and new.status = 'invited' then
    perform public.notify(new.user_id, proj.owner_id, 'collab_invite', proj.id,
      'הזמין/ה אותך לפרויקט "' || left(proj.title, 60) || '"', '/collabs/' || proj.id);
  elsif tg_op = 'UPDATE' and old.status <> 'active' and new.status = 'active' then
    if old.status = 'requested' then
      perform public.notify(new.user_id, proj.owner_id, 'collab_accepted', proj.id,
        'אישר/ה את הצטרפותך לפרויקט "' || left(proj.title, 60) || '"', '/collabs/' || proj.id);
    else
      perform public.notify(proj.owner_id, new.user_id, 'collab_accepted', proj.id,
        'הצטרף/ה לפרויקט "' || left(proj.title, 60) || '"', '/collabs/' || proj.id);
    end if;
  end if;
  return new;
end $$;
create trigger collab_members_notify after insert or update on public.collab_members
  for each row execute function public.trg_collab_members_notify();

create table public.collab_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.collab_projects (id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  description text not null default '' check (length(description) <= 2000),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index collab_tasks_project on public.collab_tasks (project_id);
create trigger collab_tasks_updated_at before update on public.collab_tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Courses
-- ---------------------------------------------------------------------
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(btrim(title)) between 3 and 150),
  description text not null default '' check (length(description) <= 10000),
  category text not null default 'other' check (category in ('guitar', 'piano', 'vocals', 'drums', 'bass', 'production', 'theory', 'mixing', 'songwriting', 'dj', 'other')),
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  cover_url text check (public.is_http_url(cover_url)),
  what_you_learn text[] not null default '{}' check (cardinality(what_you_learn) <= 20),
  is_free boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_published on public.courses (is_published, created_at desc);
create trigger courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  position int not null default 0,
  title text not null check (length(btrim(title)) between 1 and 200),
  description text not null default '' check (length(description) <= 10000),
  video_url text check (public.is_http_url(video_url)),
  duration_minutes int check (duration_minutes between 0 and 600),
  is_preview boolean not null default false,
  created_at timestamptz not null default now()
);
create index lessons_course on public.lessons (course_id, position);

create table public.enrollments (
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, user_id)
);
create index enrollments_user on public.enrollments (user_id);

create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create or replace function public.can_teach()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and (is_instructor or plan_tier = 'premium' or is_admin)
  )
$$;

create or replace function public.is_course_instructor(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.courses where id = cid and instructor_id = auth.uid())
$$;

create or replace function public.is_enrolled(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrollments where course_id = cid and user_id = auth.uid())
$$;

create or replace function public.can_enroll(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.courses c
    where c.id = cid and c.is_published
      and (c.is_free or exists (
        select 1 from public.profiles p where p.id = auth.uid() and p.plan_tier in ('pro', 'premium')))
  )
$$;

-- Public course outline (titles only — never exposes video URLs of locked lessons)
create or replace function public.course_outline(cid uuid)
returns table (id uuid, "position" int, title text, duration_minutes int, is_preview boolean)
language sql stable security definer set search_path = '' as $$
  select l.id, l.position, l.title, l.duration_minutes, l.is_preview
  from public.lessons l
  join public.courses c on c.id = l.course_id
  where l.course_id = cid and (c.is_published or c.instructor_id = auth.uid())
  order by l.position, l.created_at
$$;

create or replace function public.course_stats(cid uuid)
returns table (students bigint, lessons bigint, total_minutes bigint)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*) from public.enrollments where course_id = cid),
    (select count(*) from public.lessons where course_id = cid),
    (select coalesce(sum(duration_minutes), 0) from public.lessons where course_id = cid)
  from public.courses c where c.id = cid and (c.is_published or c.instructor_id = auth.uid())
$$;

-- Account deletion is done by the `delete-account` edge function (removes the
-- user's files, then the auth user; every table below cascades from it).

-- =====================================================================
-- Privileges + Row Level Security
-- =====================================================================
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon;

grant usage on schema public to anon, authenticated;

-- Functions callable by signed-in users
grant execute on function
  public.start_conversation(uuid), public.my_conversations(),
  public.course_outline(uuid), public.course_stats(uuid),
  public.can_teach(), public.can_enroll(uuid), public.is_enrolled(uuid)
to authenticated;
grant execute on function public.course_outline(uuid), public.course_stats(uuid) to anon;
-- Helpers used inside RLS policies must be executable by the querying role
grant execute on function
  public.is_http_url(text), public.valid_links(jsonb), public.is_blocked_between(uuid, uuid),
  public.is_conversation_member(uuid), public.is_project_owner(uuid), public.is_project_member(uuid),
  public.can_view_project(uuid), public.is_course_instructor(uuid)
to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.collab_projects enable row level security;
alter table public.collab_members enable row level security;
alter table public.collab_tasks enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;

-- profiles: public read, owner edits safe columns only
grant select on public.profiles to anon, authenticated;
grant update (username, full_name, avatar_url, cover_url, bio, location, user_type, instruments,
  genres, musical_roles, looking_for, open_for_collaboration, links, onboarding_completed)
  on public.profiles to authenticated;
create policy profiles_read on public.profiles for select using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- subscriptions: owner can read, nobody but the server writes
grant select on public.subscriptions to authenticated;
create policy subscriptions_read_own on public.subscriptions for select to authenticated
  using (user_id = auth.uid());

-- blocks
grant select, insert, delete on public.blocks to authenticated;
create policy blocks_own on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- reports: write-only for users
grant insert on public.reports to authenticated;
grant select on public.reports to authenticated;
create policy reports_insert_own on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open');
create policy reports_read_own on public.reports for select to authenticated
  using (reporter_id = auth.uid());

-- follows
grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;
create policy follows_read on public.follows for select using (true);
create policy follows_insert_own on public.follows for insert to authenticated
  with check (follower_id = auth.uid() and not public.is_blocked_between(follower_id, following_id));
create policy follows_delete_own on public.follows for delete to authenticated
  using (follower_id = auth.uid());

-- posts
grant select on public.posts to anon, authenticated;
grant insert, delete on public.posts to authenticated;
grant update (content, media_url, media_type, genres, collaboration_wanted) on public.posts to authenticated;
create policy posts_read on public.posts for select
  using (auth.uid() is null or not public.is_blocked_between(auth.uid(), author_id));
create policy posts_insert_own on public.posts for insert to authenticated
  with check (author_id = auth.uid());
create policy posts_update_own on public.posts for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy posts_delete_own on public.posts for delete to authenticated
  using (author_id = auth.uid());

-- likes
grant select on public.post_likes to anon, authenticated;
grant insert, delete on public.post_likes to authenticated;
create policy likes_read on public.post_likes for select using (true);
create policy likes_insert_own on public.post_likes for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.posts p where p.id = post_id and not public.is_blocked_between(auth.uid(), p.author_id)));
create policy likes_delete_own on public.post_likes for delete to authenticated
  using (user_id = auth.uid());

-- comments
grant select on public.post_comments to anon, authenticated;
grant insert, delete on public.post_comments to authenticated;
grant update (content) on public.post_comments to authenticated;
create policy comments_read on public.post_comments for select
  using (auth.uid() is null or not public.is_blocked_between(auth.uid(), author_id));
create policy comments_insert_own on public.post_comments for insert to authenticated
  with check (author_id = auth.uid() and exists (
    select 1 from public.posts p where p.id = post_id and not public.is_blocked_between(auth.uid(), p.author_id)));
create policy comments_update_own on public.post_comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy comments_delete on public.post_comments for delete to authenticated
  using (author_id = auth.uid() or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

-- conversations / messages: members only. Conversations are created via start_conversation().
grant select on public.conversations to authenticated;
create policy conversations_members on public.conversations for select to authenticated
  using (public.is_conversation_member(id));

grant select on public.conversation_members to authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;
create policy conv_members_read on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy conv_members_update_own on public.conversation_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert on public.messages to authenticated;
create policy messages_read on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy messages_send on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
    and not exists (
      select 1 from public.conversation_members m
      where m.conversation_id = messages.conversation_id and m.user_id <> auth.uid()
        and public.is_blocked_between(auth.uid(), m.user_id))
  );

-- notifications: owner reads / marks read / deletes; never inserts
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_own_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- collab projects
grant select on public.collab_projects to anon, authenticated;
grant insert, delete on public.collab_projects to authenticated;
grant update (title, description, type, status, genres, looking_for_roles, location, is_remote, is_public, cover_url)
  on public.collab_projects to authenticated;
create policy projects_read on public.collab_projects for select
  using (is_public or owner_id = auth.uid() or public.can_view_project(id));
create policy projects_insert on public.collab_projects for insert to authenticated
  with check (owner_id = auth.uid());
create policy projects_update on public.collab_projects for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy projects_delete on public.collab_projects for delete to authenticated
  using (owner_id = auth.uid());

grant select on public.collab_members to anon, authenticated;
grant insert, delete on public.collab_members to authenticated;
grant update (status, instrument) on public.collab_members to authenticated;
create policy members_read on public.collab_members for select
  using (public.can_view_project(project_id));
create policy members_insert on public.collab_members for insert to authenticated
  with check (user_id = auth.uid() or public.is_project_owner(project_id));
create policy members_update on public.collab_members for update to authenticated
  using (user_id = auth.uid() or public.is_project_owner(project_id))
  with check (user_id = auth.uid() or public.is_project_owner(project_id));
create policy members_delete on public.collab_members for delete to authenticated
  using (user_id = auth.uid() or public.is_project_owner(project_id));

grant select, insert, delete on public.collab_tasks to authenticated;
grant update (title, description, status, assignee_id, due_date) on public.collab_tasks to authenticated;
create policy tasks_members on public.collab_tasks for all to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id) and created_by = auth.uid()
    and (assignee_id is null or exists (
      select 1 from public.collab_members m
      where m.project_id = collab_tasks.project_id and m.user_id = assignee_id and m.status = 'active')));
-- separate update policy: any active member may edit a task created by someone else
create policy tasks_members_update on public.collab_tasks for update to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id)
    and (assignee_id is null or exists (
      select 1 from public.collab_members m
      where m.project_id = collab_tasks.project_id and m.user_id = assignee_id and m.status = 'active')));

-- courses
grant select on public.courses to anon, authenticated;
grant insert, delete on public.courses to authenticated;
grant update (title, description, category, level, cover_url, what_you_learn, is_published)
  on public.courses to authenticated;
create policy courses_read on public.courses for select
  using (is_published or instructor_id = auth.uid());
create policy courses_insert on public.courses for insert to authenticated
  with check (instructor_id = auth.uid() and public.can_teach() and is_free);
create policy courses_update on public.courses for update to authenticated
  using (instructor_id = auth.uid()) with check (instructor_id = auth.uid());
create policy courses_delete on public.courses for delete to authenticated
  using (instructor_id = auth.uid());

grant select on public.lessons to anon, authenticated;
grant insert, update, delete on public.lessons to authenticated;
create policy lessons_read on public.lessons for select
  using (
    public.is_course_instructor(course_id)
    or (exists (select 1 from public.courses c where c.id = course_id and c.is_published)
        and (is_preview or public.is_enrolled(course_id)))
  );
create policy lessons_write on public.lessons for all to authenticated
  using (public.is_course_instructor(course_id))
  with check (public.is_course_instructor(course_id));

grant select, insert, delete on public.enrollments to authenticated;
create policy enrollments_read on public.enrollments for select to authenticated
  using (user_id = auth.uid() or public.is_course_instructor(course_id));
create policy enrollments_insert on public.enrollments for insert to authenticated
  with check (user_id = auth.uid() and public.can_enroll(course_id));
create policy enrollments_delete on public.enrollments for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on public.lesson_progress to authenticated;
create policy progress_own on public.lesson_progress for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.lessons l where l.id = lesson_id and public.is_enrolled(l.course_id)));

-- Server (edge functions with the service key) can do everything
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------------
-- Realtime (RLS still applies to subscriptions)
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.messages, public.notifications;

-- ---------------------------------------------------------------------
-- Storage: public buckets for avatars and post/course media.
-- Files must live under a folder named after the uploader's user id.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('media', 'media', true, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/webm'])
on conflict (id) do nothing;

create policy storage_public_read on storage.objects for select
  using (bucket_id in ('avatars', 'media'));
create policy storage_insert_own_folder on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'media') and (storage.foldername(name))[1] = auth.uid()::text);
create policy storage_update_own_folder on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'media') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('avatars', 'media') and (storage.foldername(name))[1] = auth.uid()::text);
create policy storage_delete_own_folder on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'media') and (storage.foldername(name))[1] = auth.uid()::text);
