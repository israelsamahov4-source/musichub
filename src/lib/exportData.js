import { supabase } from "@/lib/supabase";
import { MEMBER_PROFILE_COLS } from "@/api/profiles";

/** Collects everything the database stores about the signed-in user and downloads it as JSON. */
export async function downloadMyData(userId, email) {
  const q = (table, col = "user_id", select = "*") => supabase.from(table).select(select).eq(col, userId).then((r) => r.data ?? []);
  const [profile, cv, subscription, posts, comments, likes, following, followers, notifications, memberships, tasks,
    courses, enrollments, progress, blocks, reports, conversations] = await Promise.all([
    supabase.from("profiles").select(MEMBER_PROFILE_COLS).eq("id", userId).single().then((r) => r.data),
    supabase.from("profile_details").select("*").eq("user_id", userId).maybeSingle().then((r) => r.data),
    supabase.from("subscriptions").select("tier, status, billing_cycle, current_period_end, provider").eq("user_id", userId).maybeSingle().then((r) => r.data),
    q("posts", "author_id"), q("post_comments", "author_id"), q("post_likes"),
    q("follows", "follower_id"), q("follows", "following_id"), q("notifications"),
    q("collab_members"), q("collab_tasks", "created_by"), q("courses", "instructor_id"),
    q("enrollments"), q("lesson_progress"), q("blocks", "blocker_id"), q("reports", "reporter_id"),
    supabase.rpc("my_conversations").then((r) => r.data ?? []),
  ]);
  const ids = conversations.map((c) => c.conversation_id);
  const messages = ids.length
    ? (await supabase.from("messages").select("conversation_id, sender_id, content, created_at").in("conversation_id", ids).order("created_at")).data ?? []
    : [];
  const data = {
    exported_at: new Date().toISOString(), account: { id: userId, email }, profile, cv, subscription,
    posts, comments, likes, following, followers, notifications, project_memberships: memberships, tasks_created: tasks,
    courses_taught: courses, enrollments, lesson_progress: progress, blocked_users: blocks, reports_sent: reports,
    conversations: conversations.map((c) => ({ ...c, messages: messages.filter((m) => m.conversation_id === c.conversation_id) })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: `musichub-my-data-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
