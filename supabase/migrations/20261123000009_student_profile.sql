-- =====================================================================
-- Studies on the profile: institution, track and year (or "alumni").
-- All three are optional. They are stored as short keys; the site turns
-- them into names (src/lib/config.js), so new institutions or tracks can be
-- added later without another database change.
-- Like location and bio, only signed-in members can see them, and each
-- member can change only their own.
-- Nothing is deleted, so this can be undone by dropping the three columns.
-- =====================================================================

alter table public.profiles
  add column if not exists institution text check (institution ~ '^[a-z_]{2,30}$'),
  add column if not exists study_track text check (study_track ~ '^[a-z_]{2,30}$'),
  add column if not exists study_year text
    check (study_year in ('year1', 'year2', 'year3', 'year4', 'masters', 'alumni'));

create index if not exists profiles_institution on public.profiles (institution) where institution is not null;

grant select (institution, study_track, study_year) on public.profiles to authenticated;
grant update (institution, study_track, study_year) on public.profiles to authenticated;
