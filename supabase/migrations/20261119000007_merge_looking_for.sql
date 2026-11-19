-- =====================================================================
-- One "what I'm looking for" question instead of three.
-- profiles.looking_for is now the only list the site reads and writes.
--   * Answers from the CV question (profile_details.open_to) are added to it.
--   * open_for_collaboration now simply means "picked at least one thing".
-- Nothing is deleted: profile_details.open_to stays as it was, so this can be undone.
-- =====================================================================

update public.profiles p
set looking_for = merged.list
from (
  select d.user_id,
    array(
      select distinct v from unnest(
        pr.looking_for || array(
          select case o
            when 'projects' then 'collaboration'
            when 'band' then 'band_members'
            else o  -- gigs, sessions, teaching and paid_work keep their names
          end
          from unnest(d.open_to) as o
        )
      ) as v
      order by v
    ) as list
  from public.profile_details d
  join public.profiles pr on pr.id = d.user_id
  where cardinality(d.open_to) > 0
) as merged
where p.id = merged.user_id;

update public.profiles
set open_for_collaboration = cardinality(looking_for) > 0
where open_for_collaboration is distinct from (cardinality(looking_for) > 0);
