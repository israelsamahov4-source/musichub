-- =====================================================================
-- Two-step verification for project sheet music.
-- 20261113000005_mfa.sql added the "mfa_required" rule to every table that
-- existed then. collab_scores came later, so it needs the same rule:
-- an account that turned on two-step verification sees no sheet music
-- until its session has passed the second step.
-- Any NEW table needs this line too.
-- =====================================================================
create policy mfa_required on public.collab_scores as restrictive to authenticated
  using (public.mfa_ok()) with check (public.mfa_ok());
