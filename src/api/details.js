import { supabase, unwrap } from "@/lib/supabase";

/** The musical CV of a user, or null when its owner chose not to show it to you. */
export async function fetchDetails(userId) {
  return unwrap(await supabase.from("profile_details").select("*").eq("user_id", userId).maybeSingle());
}

/** CVs for several users at once (rows you aren't allowed to see are simply missing). */
export async function fetchDetailsMap(userIds) {
  if (!userIds.length) return {};
  const rows = unwrap(await supabase.from("profile_details")
    .select("user_id, headline, open_to, years_experience, experience, skills").in("user_id", userIds));
  return Object.fromEntries(rows.map((r) => [r.user_id, r]));
}
