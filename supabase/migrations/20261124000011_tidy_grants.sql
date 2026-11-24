-- =====================================================================
-- profile_details was created after the first "revoke all", so it kept
-- Supabase's broad default grants (TRUNCATE, TRIGGER, REFERENCES) for
-- anon and authenticated. The site never uses them; take them away so
-- this table matches every other table. Reading and editing stay as they are.
-- =====================================================================
revoke truncate, trigger, references on public.profile_details from anon, authenticated;
