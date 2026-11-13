import { supabase, unwrap } from "@/lib/supabase";

export const COURSE_CARD = "id, title, description, category, level, cover_url, is_free, is_published, created_at, instructor:profiles!courses_instructor_id_fkey(id, username, full_name, avatar_url)";

export async function fetchCourse(id) {
  const course = unwrap(await supabase.from("courses").select(`*, instructor:profiles!courses_instructor_id_fkey(id, username, full_name, avatar_url)`).eq("id", id).maybeSingle());
  if (!course) return null;
  const [outline, stats] = await Promise.all([
    supabase.rpc("course_outline", { cid: id }).then(unwrap),
    supabase.rpc("course_stats", { cid: id }).then(unwrap),
  ]);
  return { ...course, outline, stats: stats?.[0] ?? { students: 0, lessons: 0, total_minutes: 0 } };
}

export async function fetchProgress(courseId, userId) {
  if (!userId) return { enrolled: false, completed: new Set() };
  const [enr, prog] = await Promise.all([
    supabase.from("enrollments").select("course_id").eq("course_id", courseId).eq("user_id", userId).then(unwrap),
    supabase.from("lesson_progress").select("lesson_id, lessons!inner(course_id)").eq("user_id", userId).eq("lessons.course_id", courseId).then(unwrap),
  ]);
  return { enrolled: enr.length > 0, completed: new Set(prog.map((p) => p.lesson_id)) };
}

export const canTeach = (profile) => Boolean(profile && (profile.is_instructor || profile.plan_tier === "premium" || profile.is_admin));
export const hasPro = (profile) => profile?.plan_tier === "pro" || profile?.plan_tier === "premium";
