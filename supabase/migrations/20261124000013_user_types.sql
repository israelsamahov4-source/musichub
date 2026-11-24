-- =====================================================================
-- "What describes you best?" and where students study, in their own words.
--   1. user_type gets more answers: music lover, music student, musician,
--      producer, music teacher. The two old answers keep their values.
--   2. institution becomes free text (only students fill it), 2 to 100
--      characters, instead of a fixed list of keys.
--      Track and year are no longer asked. The columns stay, so nothing is
--      deleted; the site clears them the next time someone saves.
-- Who can read these columns does not change (signed-in members only).
-- =====================================================================

-- 1 -------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_user_type_check;
alter table public.profiles add constraint profiles_user_type_check
  check (user_type in ('listener', 'student', 'musician', 'producer', 'teacher'));

-- 2 -------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_institution_check;

-- Earlier answers were list keys. Turn them into readable names, and mark
-- whoever was studying as a student (graduates keep their type).
update public.profiles
set institution = case institution
      when 'jamd' then 'האקדמיה למוזיקה ולמחול בירושלים'
      when 'buchmann' then 'בית הספר למוזיקה בוכמן-מהטה'
      when 'rimon' then 'רימון'
      when 'levinsky' then 'מכללת לוינסקי'
      when 'bar_ilan' then 'אוניברסיטת בר-אילן'
      else null
    end,
    user_type = case when study_year = 'alumni' then user_type else 'student' end
where institution is not null;

alter table public.profiles add constraint profiles_institution_check
  check (length(btrim(institution)) between 2 and 100);
