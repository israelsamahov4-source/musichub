import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Camera, Eye, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import Field from "@/components/Field";
import PageLoader from "@/components/PageLoader";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { supabase, unwrap } from "@/lib/supabase";
import { ACCEPT, uploadFile } from "@/lib/upload";
import { canTeach } from "@/api/courses";
import { useAuth } from "@/auth/AuthProvider";
import { COURSE_CATEGORIES, COURSE_LEVELS } from "@/lib/config";
import { errorMessage, normalizeUrl, safeUrl, videoEmbedUrl } from "@/lib/utils";

const EMPTY = { title: "", description: "", category: "guitar", level: "beginner", cover_url: null, what_you_learn: [], is_free: true, is_published: false };
const EMPTY_LESSON = { title: "", description: "", video_url: "", duration_minutes: "", is_preview: false };

function LessonDialog({ open, onOpenChange, initial, onSave, saving }) {
  const [l, setL] = useState(initial);
  useEffect(() => setL(initial), [initial]);
  const set = (k) => (e) => setL({ ...l, [k]: e?.target ? e.target.value : e });
  const videoOk = !l.video_url || safeUrl(normalizeUrl(l.video_url));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{initial.id ? "עריכת שיעור" : "שיעור חדש"}</DialogTitle></DialogHeader>
        <Field id="lt" label="כותרת"><Input id="lt" value={l.title} onChange={set("title")} maxLength={200} /></Field>
        <Field id="lv" label="קישור לווידאו" hint="YouTube (גם 'לא רשום') או Vimeo. מומלץ להעלות לשם ולהדביק כאן את הקישור." error={videoOk ? null : "קישור לא תקין"}>
          <Input id="lv" dir="ltr" value={l.video_url} onChange={set("video_url")} placeholder="https://youtu.be/…" />
        </Field>
        {l.video_url && videoOk && !videoEmbedUrl(normalizeUrl(l.video_url)) && <p className="text-xs text-amber-700">הקישור יוצג כקישור חיצוני (לא נגן מוטמע).</p>}
        <Field id="ld" label="תיאור / הערות לשיעור"><Textarea id="ld" value={l.description} onChange={set("description")} maxLength={10000} rows={5} /></Field>
        <div className="flex flex-wrap items-end gap-4">
          <Field id="lm" label="משך (דקות)"><Input id="lm" type="number" min={0} max={600} value={l.duration_minutes} onChange={set("duration_minutes")} className="w-28" /></Field>
          <label className="flex items-center gap-2 pb-2 text-sm"><Switch aria-label="שיעור לצפייה חינם" checked={l.is_preview} onCheckedChange={set("is_preview")} />שיעור לצפייה חינם (גם בלי הרשמה)</label>
        </div>
        <DialogFooter><Button onClick={() => onSave(l)} disabled={!l.title.trim() || !videoOk || saving}>שמירה</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CourseEditor() {
  const { id } = useParams();
  const isNew = !id;
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(isNew ? EMPTY : null);
  const [point, setPoint] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lessonDialog, setLessonDialog] = useState(null);
  const coverRef = useRef(null);

  const course = useQuery({
    queryKey: ["course-edit", id],
    enabled: !isNew,
    queryFn: async () => unwrap(await supabase.from("courses").select("*").eq("id", id).maybeSingle()),
  });
  const lessons = useQuery({
    queryKey: ["lessons-edit", id],
    enabled: !isNew,
    queryFn: async () => unwrap(await supabase.from("lessons").select("*").eq("course_id", id).order("position").order("created_at")),
  });
  useEffect(() => { if (course.data && !form) setForm(course.data); }, [course.data, form]);

  const onErr = (e) => toast.error(errorMessage(e));
  const refreshLessons = () => { qc.invalidateQueries({ queryKey: ["lessons-edit", id] }); qc.invalidateQueries({ queryKey: ["course", id] }); };

  const save = useMutation({
    mutationFn: async (overrides = {}) => {
      const v = { ...form, ...overrides };
      const values = {
        title: v.title.trim(), description: v.description.trim(), category: v.category, level: v.level,
        cover_url: v.cover_url, what_you_learn: v.what_you_learn, is_free: v.is_free, is_published: v.is_published,
      };
      if (isNew) return unwrap(await supabase.from("courses").insert({ ...values, instructor_id: user.id }).select("id").single());
      unwrap(await supabase.from("courses").update(values).eq("id", id));
      return { id };
    },
    onSuccess: (res, overrides) => {
      if (overrides?.is_published !== undefined) setForm((f) => ({ ...f, is_published: overrides.is_published }));
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["course", res.id] });
      toast.success(isNew ? "הקורס נוצר. עכשיו מוסיפים שיעורים" : "נשמר");
      if (isNew) navigate(`/courses/${res.id}/edit`, { replace: true });
    },
    onError: onErr,
  });

  const saveLesson = useMutation({
    mutationFn: async (l) => {
      const values = {
        title: l.title.trim(), description: (l.description || "").trim(),
        video_url: l.video_url ? normalizeUrl(l.video_url) : null,
        duration_minutes: l.duration_minutes === "" || l.duration_minutes == null ? null : Math.max(0, Math.min(600, Number(l.duration_minutes))),
        is_preview: l.is_preview,
      };
      if (l.id) return unwrap(await supabase.from("lessons").update(values).eq("id", l.id));
      const position = (lessons.data?.at(-1)?.position ?? 0) + 1;
      return unwrap(await supabase.from("lessons").insert({ ...values, course_id: id, position }));
    },
    onSuccess: () => { setLessonDialog(null); refreshLessons(); },
    onError: onErr,
  });
  const deleteLesson = useMutation({
    mutationFn: async (lid) => unwrap(await supabase.from("lessons").delete().eq("id", lid)),
    onSuccess: refreshLessons, onError: onErr,
  });
  const move = useMutation({
    mutationFn: async ({ a, b }) => {
      unwrap(await supabase.from("lessons").update({ position: b.position }).eq("id", a.id));
      unwrap(await supabase.from("lessons").update({ position: a.position }).eq("id", b.id));
    },
    onSuccess: refreshLessons, onError: onErr,
  });
  const deleteCourse = useMutation({
    mutationFn: async () => unwrap(await supabase.from("courses").delete().eq("id", id)),
    onSuccess: () => { toast.success("הקורס נמחק"); qc.invalidateQueries({ queryKey: ["courses"] }); navigate("/courses"); },
    onError: onErr,
  });

  if (!canTeach(profile)) {
    return (
      <div className="page-narrow">
        <EmptyState title="פתיחת קורסים זמינה למורים" text="כדי ללמד צריך מנוי Premium או אישור מורה מהצוות."
          action={<Button asChild><Link to="/pricing">לפרטים</Link></Button>} />
      </div>
    );
  }
  if (!form || (!isNew && lessons.isLoading)) return <PageLoader />;
  if (!isNew && form.instructor_id && form.instructor_id !== user.id) return <div className="page"><EmptyState title="אין הרשאה לערוך את הקורס" /></div>;

  const set = (k) => (e) => setForm({ ...form, [k]: e?.target ? e.target.value : e });
  const onCover = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try { const url = await uploadFile(file, { kind: "image", userId: user.id }); setForm((f) => ({ ...f, cover_url: url })); }
    catch (err) { onErr(err); } finally { setUploading(false); }
  };
  const addPoint = () => { if (point.trim()) { setForm({ ...form, what_you_learn: [...form.what_you_learn, point.trim()].slice(0, 20) }); setPoint(""); } };
  const list = lessons.data ?? [];

  return (
    <div className="page-narrow space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="page-title riso flex-1">{isNew ? "קורס חדש" : "עריכת קורס"}</h1>
        {!isNew && <Button asChild variant="outline"><Link to={`/courses/${id}`}><Eye />תצוגה</Link></Button>}
      </div>

      <Card className="space-y-4 p-5">
        <Field id="ct" label="שם הקורס"><Input id="ct" value={form.title} onChange={set("title")} maxLength={150} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cc" label="תחום">
            <Select value={form.category} onValueChange={set("category")} dir="rtl">
              <SelectTrigger id="cc"><SelectValue /></SelectTrigger>
              <SelectContent>{COURSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field id="cl" label="רמה">
            <Select value={form.level} onValueChange={set("level")} dir="rtl">
              <SelectTrigger id="cl"><SelectValue /></SelectTrigger>
              <SelectContent>{COURSE_LEVELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <Field id="cd" label="תיאור הקורס"><Textarea id="cd" value={form.description} onChange={set("description")} maxLength={10000} rows={5} /></Field>
        <Field label="תמונת שער">
          <div className="flex items-center gap-3">
            {safeUrl(form.cover_url) && <img src={safeUrl(form.cover_url)} alt="" className="h-16 w-28 rounded-md object-cover" />}
            <input ref={coverRef} type="file" accept={ACCEPT.image} hidden onChange={onCover} />
            <Button type="button" variant="outline" onClick={() => coverRef.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="animate-spin" /> : <Camera />}העלאה</Button>
          </div>
        </Field>
        <Field label="מה התלמידים ילמדו">
          <ul className="mb-2 space-y-1">
            {form.what_you_learn.map((w, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="flex-1">• {w}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="הסרה" onClick={() => setForm({ ...form, what_you_learn: form.what_you_learn.filter((_, j) => j !== i) })}><X /></Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input value={point} onChange={(e) => setPoint(e.target.value)} maxLength={200} placeholder="לדוגמה: לנגן 5 אקורדים בסיסיים" aria-label="נקודה חדשה"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPoint())} />
            <Button type="button" variant="secondary" onClick={addPoint}>הוספה</Button>
          </div>
        </Field>
        <label className="flex items-center gap-2 text-sm"><Switch aria-label="קורס Pro" checked={!form.is_free} onCheckedChange={(v) => setForm({ ...form, is_free: !v })} />קורס Pro (רק למנויי Pro ו-Premium)</label>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate({})} disabled={form.title.trim().length < 3 || save.isPending}>{isNew ? "יצירת קורס" : "שמירת פרטים"}</Button>
        </div>
      </Card>

      {!isNew && (
        <>
          <Card className="p-5">
            <div className="mb-3 flex items-center">
              <h2 className="flex-1 text-lg font-semibold">שיעורים ({list.length})</h2>
              <Button onClick={() => setLessonDialog(EMPTY_LESSON)}><Plus />שיעור</Button>
            </div>
            {list.length === 0 ? <p className="text-sm text-muted-foreground">הוסיפו את השיעור הראשון.</p> : (
              <ol className="space-y-2">
                {list.map((l, i) => (
                  <li key={l.id} className="flex items-center gap-2 rounded-md border p-2.5 text-sm">
                    <span className="w-5 text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 truncate">{l.title}{l.is_preview && <span className="ms-2 text-xs text-primary">חינם</span>}{!l.video_url && <span className="ms-2 text-xs text-amber-700">ללא וידאו</span>}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="למעלה" disabled={i === 0} onClick={() => move.mutate({ a: l, b: list[i - 1] })}><ArrowUp /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="למטה" disabled={i === list.length - 1} onClick={() => move.mutate({ a: l, b: list[i + 1] })}><ArrowDown /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="עריכה" onClick={() => setLessonDialog({ ...l, video_url: l.video_url || "", duration_minutes: l.duration_minutes ?? "" })}><Pencil /></Button>
                    <ConfirmDialog trigger={<Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="מחיקה"><Trash2 /></Button>}
                      title="למחוק את השיעור?" confirmLabel="מחיקה" destructive onConfirm={() => deleteLesson.mutate(l.id)} />
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card className="flex flex-wrap items-center gap-3 p-5">
            <div className="flex-1">
              <h2 className="font-semibold">{form.is_published ? "הקורס מפורסם" : "הקורס בטיוטה"}</h2>
              <p className="text-sm text-muted-foreground">{form.is_published ? "כולם יכולים למצוא את הקורס ולהירשם אליו." : "רק אתם רואים את הקורס עד שתפרסמו אותו."}</p>
            </div>
            <Button variant={form.is_published ? "outline" : "default"} disabled={save.isPending || (!form.is_published && list.length === 0)}
              onClick={() => save.mutate({ is_published: !form.is_published })}>
              {form.is_published ? "הסתרה (חזרה לטיוטה)" : "פרסום הקורס"}
            </Button>
            <ConfirmDialog trigger={<Button variant="ghost" className="text-destructive"><Trash2 />מחיקת הקורס</Button>}
              title="למחוק את הקורס?" description="כל השיעורים וההרשמות יימחקו. אי אפשר לבטל." confirmLabel="מחיקה" destructive onConfirm={() => deleteCourse.mutate()} />
          </Card>
        </>
      )}

      {lessonDialog && (
        <LessonDialog open onOpenChange={(o) => !o && setLessonDialog(null)} initial={lessonDialog} saving={saveLesson.isPending} onSave={(l) => saveLesson.mutate(l)} />
      )}
    </div>
  );
}
