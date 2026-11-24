import { supabase, unwrap } from "@/lib/supabase";
import { MEMBER_PROFILE_COLS } from "@/api/profiles";

const PAGE = 1000;

/** Every row of a query, page by page (the server returns at most 1000 rows per request). Throws on any error. */
async function all(build) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const page = unwrap(await build().range(from, from + PAGE - 1));
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

/**
 * Collects everything the database stores about the signed-in user and downloads it as JSON.
 * If any part fails the download is cancelled (with an error), so the user never gets a silently partial file.
 */
export async function downloadMyData(userId, email) {
  const mine = (table, col = "user_id", select = "*") => all(() => supabase.from(table).select(select).eq(col, userId).order("created_at"));
  const [profile, cv, subscription, posts, comments, likes, following, followers, notifications, memberships,
    projectsOwned, tasksCreated, tasksAssigned, scoresWritten, courses, enrollments, progress, blocks, reports, conversations, account] = await Promise.all([
    supabase.from("profiles").select(MEMBER_PROFILE_COLS).eq("id", userId).single().then(unwrap),
    supabase.from("profile_details").select("*").eq("user_id", userId).maybeSingle().then(unwrap),
    supabase.from("subscriptions").select("tier, status, billing_cycle, current_period_end, provider").eq("user_id", userId).maybeSingle().then(unwrap),
    mine("posts", "author_id"), mine("post_comments", "author_id"), mine("post_likes"),
    mine("follows", "follower_id"), mine("follows", "following_id"), mine("notifications"),
    mine("collab_members"), mine("collab_projects", "owner_id"), mine("collab_tasks", "created_by"), mine("collab_tasks", "assignee_id"), mine("collab_scores", "created_by"),
    mine("courses", "instructor_id"), mine("enrollments"),
    all(() => supabase.from("lesson_progress").select("*").eq("user_id", userId).order("completed_at")),
    mine("blocks", "blocker_id"), mine("reports", "reporter_id"),
    supabase.rpc("my_conversations").then(unwrap),
    supabase.rpc("my_account").then(unwrap),
  ]);
  if (!profile) throw new Error("not loaded");

  const courseIds = courses.map((c) => c.id);
  const lessons = courseIds.length
    ? await all(() => supabase.from("lessons").select("*").in("course_id", courseIds).order("position"))
    : [];
  // One request per conversation: keeps URLs short and each conversation complete.
  const threads = [];
  for (const c of conversations ?? []) {
    const messages = await all(() => supabase.from("messages").select("sender_id, content, created_at")
      .eq("conversation_id", c.conversation_id).order("created_at"));
    threads.push({ ...c, messages });
  }

  const data = {
    exported_at: new Date().toISOString(), account: { id: userId, email }, settings: { email_on_message: account?.email_on_message ?? true }, profile, cv, subscription,
    posts, comments, likes, following, followers, notifications,
    projects_owned: projectsOwned, project_memberships: memberships, tasks_created: tasksCreated, tasks_assigned: tasksAssigned, project_scores_written: scoresWritten,
    courses_taught: courses, lessons_taught: lessons, enrollments, lesson_progress: progress,
    blocked_users: blocks, reports_sent: reports, conversations: threads,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: `jamly-my-data-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
