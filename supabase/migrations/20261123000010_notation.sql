-- =====================================================================
-- Sheet music written inside the site (stored as ABC notation text).
--   1. lessons.notation – a teacher writes the notes for a lesson.
--   2. posts.notation   – a short melody or riff in a feed post.
--      A post may now have only sheet music (no text or media).
--   3. collab_scores    – scores and parts inside a shared project.
--      Only active project members can see, add and edit them;
--      the writer or the project owner can delete one.
-- Nothing existing is deleted, so this can be undone by dropping the
-- new columns and the new table.
-- =====================================================================

-- 1 -------------------------------------------------------------------
alter table public.lessons
  add column if not exists notation text check (length(notation) <= 20000);

-- 2 -------------------------------------------------------------------
alter table public.posts
  add column if not exists notation text check (length(notation) <= 20000);
grant update (notation) on public.posts to authenticated;

-- The original rule was "text or media"; it becomes "text, media or sheet music".
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.posts'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%btrim(content)%media_url IS NOT NULL%'
  loop
    execute format('alter table public.posts drop constraint %I', c);
  end loop;
end $$;
alter table public.posts add constraint posts_has_something
  check (length(btrim(content)) > 0 or media_url is not null or notation is not null);

-- 3 -------------------------------------------------------------------
create table if not exists public.collab_scores (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.collab_projects (id) on delete cascade,
  title text not null default '' check (length(title) <= 120),
  notation text not null check (length(notation) between 1 and 20000),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists collab_scores_project on public.collab_scores (project_id, updated_at desc);

-- Who saved last, and when, always come from the server, never from the browser.
create or replace function public.trg_score_editor() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end $$;
create trigger collab_scores_editor before insert or update on public.collab_scores
  for each row execute function public.trg_score_editor();
create trigger collab_scores_updated_at before update on public.collab_scores
  for each row execute function public.set_updated_at();
create trigger aa_server_time before insert on public.collab_scores
  for each row execute function public.set_server_time();
create trigger suspended_collab_scores_w before insert or update on public.collab_scores
  for each row execute function public.block_suspended();
create trigger rl_collab_scores before insert on public.collab_scores
  for each row execute function public.enforce_rate_limit('created_by', '60', '1 hour');

alter table public.collab_scores enable row level security;
-- New tables get Supabase's broad default grants; start from nothing, like every other table.
revoke all on public.collab_scores from anon, authenticated;
revoke execute on function public.trg_score_editor() from public, anon, authenticated;
grant select, insert, delete on public.collab_scores to authenticated;
grant update (title, notation) on public.collab_scores to authenticated;

create policy scores_read on public.collab_scores for select to authenticated
  using (public.is_project_member(project_id));
create policy scores_insert on public.collab_scores for insert to authenticated
  with check (public.is_project_member(project_id) and created_by = auth.uid());
create policy scores_update on public.collab_scores for update to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));
create policy scores_delete on public.collab_scores for delete to authenticated
  using (public.is_project_member(project_id)
         and (created_by = auth.uid() or public.is_project_owner(project_id)));
