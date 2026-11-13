// Column lists that match what each role is allowed to read (see migration 004).
export const PUBLIC_PROFILE_COLS =
  "id, username, full_name, avatar_url, cover_url, user_type, instruments, genres, musical_roles, plan_tier, is_instructor, onboarding_completed, created_at";
export const MEMBER_PROFILE_COLS =
  `${PUBLIC_PROFILE_COLS}, bio, location, looking_for, open_for_collaboration, links, updated_at`;
