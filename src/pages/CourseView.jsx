import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, GraduationCap, Lock, Pencil, PlayCircle, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import UserAvatar from "@/components/UserAvatar";
import PageLoader from "@/components/PageLoader";
import EmptyState from "@/components/EmptyState";
import { supabase, unwrap } from "@/lib/supabase";
import { fetchCourse, fetchProgress, hasPro } from "@/api/courses";
import { useAuth } from "@/auth/AuthProvider";
import { label } from "@/lib/config";
import { errorMessage, safeUrl } from "@/lib/utils";

export default function CourseView() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: c, isLoading } = useQuery({ queryKey: ["course", id], queryFn: () => fetchCourse(id) });
  const { data: prog } = useQuery({ queryKey: ["course-progress", id, user?.id], queryFn: () => fetchProgress(id, user?.id) });

  const enroll = useMutation({
    mutationFn: async () => unwrap(await supabase.from("enrollments").insert({ course_id: id, user_id: user.id })),
    onSuccess: () => {
      toast.success("נרשמתם לקורס!");
      qc.invalidateQueries({ queryKey: ["course-progress", id] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      if (c.outline[0]) navigate(`/courses/${id}/lessons/${c.outline[0].id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading) return <PageLoader />;
  if (!c) return <div className="page"><EmptyState title="הקורס לא נמצא" /></div>;

  const mine = user?.id === c.instructor_id;
  const enrolled = prog?.enrolled;
  const done = c.outline.filter((l) => prog?.completed.has(l.id)).length;
  const nextLesson = c.outline.find((l) => !prog?.completed.has(l.id)) ?? c.outline[0];
  const locked = !c.is_free && !hasPro(profile);
  const canOpen = (l) => mine || enrolled || l.is_preview;

  const cta = () => {
    if (!user) return <Button asChild size="lg"><Link to={`/signup`}>הצטרפו כדי ללמוד</Link></Button>;
    if (mine) return <Button asChild size="lg" variant="outline"><Link to={`/courses/${id}/edit`}><Pencil />עריכת הקורס</Link></Button>;
    if (enrolled) return nextLesson && <Button asChild size="lg"><Link to={`/courses/${id}/lessons/${nextLesson.id}`}><PlayCircle />{done ? "להמשיך ללמוד" : "להתחיל ללמוד"}</Link></Button>;
    if (locked) return <Button asChild size="lg"><Link to="/pricing"><Star />קורס Pro: שדרגו כדי להירשם</Link></Button>;
    return <Button size="lg" onClick={() => enroll.mutate()} disabled={enroll.isPending}>הרשמה לקורס{c.is_free && " (חינם)"}</Button>;
  };

  return (
    <div className="page space-y-6">
      {!c.is_published && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">הקורס הוא טיוטה ורק אתם רואים אותו. פרסמו אותו מעמוד העריכה.</p>}
      <Card className="grid overflow-hidden md:grid-cols-[1fr_340px]">
        <div className="p-6">
          <p className="text-sm text-muted-foreground">{label("courseCategories", c.category)} · {label("courseLevels", c.level)}</p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">{c.title}</h1>
          <Link to={`/u/${c.instructor?.username}`} className="mt-3 inline-flex items-center gap-2 hover:underline">
            <UserAvatar profile={c.instructor} /><span className="font-medium">{c.instructor?.full_name || c.instructor?.username}</span>
          </Link>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><GraduationCap className="h-4 w-4" aria-hidden />{c.stats.lessons} שיעורים</span>
            {Number(c.stats.total_minutes) > 0 && <span className="flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden />{Math.round(c.stats.total_minutes / 6) / 10} שעות</span>}
            <span className="flex items-center gap-1"><Users className="h-4 w-4" aria-hidden />{c.stats.students} תלמידים</span>
            {!c.is_free && <span className="flex items-center gap-1 font-semibold text-primary"><Star className="h-4 w-4" aria-hidden />קורס Pro</span>}
          </div>
          <div className="mt-5">{cta()}</div>
          {enrolled && c.outline.length > 0 && (
            <div className="mt-4 max-w-sm">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>התקדמות</span><span>{done}/{c.outline.length}</span></div>
              <Progress value={(done / c.outline.length) * 100} className="h-2" aria-label="התקדמות בקורס" />
            </div>
          )}
        </div>
        <div className="aspect-video bg-gradient-to-br from-primary/80 to-secondary md:aspect-auto">
          {safeUrl(c.cover_url) && <img src={safeUrl(c.cover_url)} alt="" className="h-full w-full object-cover" />}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {c.what_you_learn?.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 text-lg font-semibold">מה תלמדו</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {c.what_you_learn.map((w, i) => <li key={i} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />{w}</li>)}
              </ul>
            </Card>
          )}
          {c.description && (
            <Card className="p-5">
              <h2 className="mb-3 text-lg font-semibold">על הקורס</h2>
              <p className="whitespace-pre-wrap break-words leading-relaxed">{c.description}</p>
            </Card>
          )}
        </div>
        <Card className="h-fit p-5">
          <h2 className="mb-3 text-lg font-semibold">תוכן הקורס</h2>
          {c.outline.length === 0 ? <p className="text-sm text-muted-foreground">עוד אין שיעורים.</p> : (
            <ol className="space-y-1">
              {c.outline.map((l, i) => {
                const completed = prog?.completed.has(l.id);
                const inner = (
                  <>
                    <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                    <span className="flex-1">{l.title}</span>
                    {l.duration_minutes ? <span className="text-xs text-muted-foreground">{l.duration_minutes} ד'</span> : null}
                    {completed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="הושלם" />
                      : canOpen(l) ? (l.is_preview && !enrolled && !mine ? <span className="text-[11px] font-medium text-primary">צפייה חינם</span> : <PlayCircle className="h-4 w-4 text-primary" aria-hidden />)
                      : <Lock className="h-4 w-4 text-muted-foreground" aria-label="נעול" />}
                  </>
                );
                return (
                  <li key={l.id}>
                    {canOpen(l) && user ? (
                      <Link to={`/courses/${id}/lessons/${l.id}`} className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted">{inner}</Link>
                    ) : <div className="flex items-center gap-2 p-2 text-sm">{inner}</div>}
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
