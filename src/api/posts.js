import { supabase, unwrap } from "@/lib/supabase";

export const AUTHOR = "id, username, full_name, avatar_url, plan_tier";
const POST_SELECT = `id, content, media_url, media_type, genres, collaboration_wanted, created_at, author_id,
  author:profiles(${AUTHOR}), likes:post_likes(count), comments:post_comments(count)`;

async function withMyLikes(posts, userId) {
  const base = posts.map((p) => ({
    ...p,
    like_count: p.likes?.[0]?.count ?? 0,
    comment_count: p.comments?.[0]?.count ?? 0,
    liked_by_me: false,
  }));
  if (!userId || !base.length) return base;
  const liked = unwrap(
    await supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", base.map((p) => p.id)),
  );
  const set = new Set(liked.map((l) => l.post_id));
  return base.map((p) => ({ ...p, liked_by_me: set.has(p.id) }));
}

export const PAGE_SIZE = 15;

/** authorIds: restrict to these authors (following feed); authorId: single profile. */
export async function fetchPosts({ page = 0, authorIds, authorId, collabOnly, userId }) {
  let q = supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (authorIds) q = q.in("author_id", authorIds);
  if (authorId) q = q.eq("author_id", authorId);
  if (collabOnly) q = q.eq("collaboration_wanted", true);
  return withMyLikes(unwrap(await q), userId);
}

export async function fetchPost(id, userId) {
  const post = unwrap(await supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle());
  if (!post) return null;
  return (await withMyLikes([post], userId))[0];
}

export async function fetchFollowingIds(userId) {
  const rows = unwrap(await supabase.from("follows").select("following_id").eq("follower_id", userId));
  return rows.map((r) => r.following_id);
}
