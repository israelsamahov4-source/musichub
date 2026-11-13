import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MediaView from "@/components/MediaView";
import PageLoader from "@/components/PageLoader";
import EmptyState from "@/components/EmptyState";
import { supabase, unwrap } from "@/lib/supabase";
import { fetchCourse, fetchProgress } from "@/api/courses";
import { useAuth } from "@/auth/AuthProvider";
import { cn, errorMessage } from "@/lib/utils";

export default function LessonView() {
  const { id, lessonId } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const course = useQuery({ queryKey: ["course", id], queryFn: () => fetchCourse(id) });
  const prog = useQuery({ queryKey: ["course-progress", id, user.id], queryFn: () => fetchProgress(id, user.id) });
  // Row Level Security only returns the lesson if it's a preview, or you're enrolled / the instructor.
  const lesson = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => unwrap(await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle()),
  });

  const completed = prog.data?.completed.has(lessonId);
  const toggle = useMutation({
    mutationFn: async () => {
      if (completed) unwrap(await supabase.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId));
      else unwrap(await supabase.from("lesson_progress").insert({ user_id: user.id, lesson_id: lessonId }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-progress", id] }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (course.isLoading || lesson.isLoading || prog.isLoading) return <PageLoader />;
  const c = course.data;
  if (!c) return <div className="page"><EmptyState title="הקורס לא נמצא" /></div>;
  if (!lesson.data) {
    return (
      <div className="page-narrow">
        <EmptyState icon={Lock} title="השיעור נעול" text="כדי לצפות בשיעור צריך להירשם לקורס."
          action={<Button asChild><Link to={`/courses/${id}`}>לעמוד הקורס</Link></Button>} />
      </div>
    );
  }

  const l = lesson.data;
  const idx = c.outline.findIndex((o) => o.id === lessonId);
  const prev = c.outline[idx - 1];
  const next = c.outline[idx + 1];
  const enrolled = prog.data?.enrolled;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-4">
        <Link to={`/courses/${id}`} className="text-sm text-muted-foreground hover:underline">{c.title}</Link>
        <h1 className="text-2xl font-bold">{l.title}</h1>
        {l.video_url ? <MediaView url={l.video_url} type="video" title={l.title} /> : <Card className="p-6 text-center text-sm text-muted-foreground">לשיעור הזה אין וידאו.</Card>}
        {l.description && <Card className="p-5"><p className="whitespace-pre-wrap break-words leading-relaxed">{l.description}</p></Card>}
        <div className="flex flex-wrap items-center gap-2">
          {prev && <Button asChild variant="outline"><Link to={`/courses/${id}/lessons/${prev.id}`}><ArrowRight />הקודם</Link></Button>}
          {enrolled && (
            <Button variant={completed ? "secondary" : "default"} onClick={() => toggle.mutate()} disabled={toggle.isPending} className="mx-auto">
              <CheckCircle2 />{completed ? "סומן כהושלם" : "סימון כהושלם"}
            </Button>
          )}
          {next && <Button asChild variant="outline" className="ms-auto"><Link to={`/courses/${id}/lessons/${next.id}`}>הבא<ArrowLeft /></Link></Button>}
        </div>
      </div>
      <Card className="h-fit p-4">
        <h2 className="mb-2 font-semibold">שיעורים</h2>
        <ol className="space-y-0.5">
          {c.outline.map((o, i) => {
            const done = prog.data?.completed.has(o.id);
            return (
              <li key={o.id}>
                <Link to={`/courses/${id}/lessons/${o.id}`} aria-current={o.id === lessonId ? "page" : undefined}
                  className={cn("flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted", o.id === lessonId && "bg-secondary font-medium")}>
                  {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label="הושלם" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
                  <span className="flex-1">{i + 1}. {o.title}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
