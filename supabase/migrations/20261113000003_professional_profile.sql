-- =====================================================================
-- Professional profile ("musical CV"), LinkedIn style.
-- Each user chooses who can see it:
--   public       anyone, including visitors without an account
--   members      any signed-in member (default)
--   applications only people they deal with: owners of projects they asked to
--                join or were invited to, project teammates, and people they
--                have a conversation with
-- =====================================================================

create or replace function public.valid_items(j jsonb, max_items int)
returns boolean language sql immutable as $$
  select jsonb_typeof(j) = 'array'
     and jsonb_array_length(j) <= max_items
     and pg_column_size(j) < 40000
     and not exists (
       select 1 from jsonb_array_elements(j) e
       where jsonb_typeof(e) <> 'object'
          or (e ? 'url' and not public.is_http_url(e ->> 'url'))
     )
$$;

create table public.profile_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  visibility text not null default 'members' check (visibility in ('public', 'members', 'applications')),
  headline text not null default '' check (length(headline) <= 120),
  open_to text[] not null default '{}' check (cardinality(open_to) <= 8),
  years_experience int check (years_experience between 0 and 80),
  skills text[] not null default '{}' check (cardinality(skills) <= 30),
  languages text[] not null default '{}' check (cardinality(languages) <= 10),
  -- [{ "title": "בסיסט", "org": "להקת X", "start_year": 2019, "end_year": null, "description": "…" }]
  experience jsonb not null default '[]' check (public.valid_items(experience, 30)),
  -- [{ "school": "רימון", "program": "הפקה", "start_year": 2018, "end_year": 2021 }]
  education jsonb not null default '[]' check (public.valid_items(education, 10)),
  -- [{ "title": "דמו – שיר חדש", "url": "https://…" }]
  portfolio jsonb not null default '[]' check (public.valid_items(portfolio, 12)),
  updated_at timestamptz not null default now()
);
create index profile_details_open_to on public.profile_details using gin (open_to);
create trigger profile_details_updated_at before update on public.profile_details
  for each row execute function public.set_updated_at();

-- Every profile gets a details row (existing ones too)
insert into public.profile_details (user_id) select id from public.profiles on conflict do nothing;

create or replace function public.trg_profile_details_row() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profile_details (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger profiles_details_row after insert on public.profiles
  for each row execute function public.trg_profile_details_row();

-- Does the signed-in user have a working relationship with `target`?
create or replace function public.has_relationship_with(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    -- target asked to join / was invited to / is in a project I own
    exists (
      select 1 from public.collab_members m
      join public.collab_projects p on p.id = m.project_id
      where m.user_id = target and p.owner_id = auth.uid()
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
    -- we have a conversation
    or exists (
      select 1 from public.conversation_members a
      join public.conversation_members b on b.conversation_id = a.conversation_id
      where a.user_id = target and b.user_id = auth.uid()
    )
  )
$$;

alter table public.profile_details enable row level security;
grant select on public.profile_details to anon, authenticated;
grant update (visibility, headline, open_to, years_experience, skills, languages, experience, education, portfolio)
  on public.profile_details to authenticated;
grant all on public.profile_details to service_role;
grant execute on function public.valid_items(jsonb, int), public.has_relationship_with(uuid) to anon, authenticated;

create policy details_read on public.profile_details for select
  using (
    user_id = auth.uid()
    or (
      (auth.uid() is null or not public.is_blocked_between(auth.uid(), user_id))
      and (
        visibility = 'public'
        or (visibility = 'members' and auth.uid() is not null)
        or (visibility = 'applications' and public.has_relationship_with(user_id))
      )
    )
  );
create policy details_update_own on public.profile_details for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
