import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Globe, Lock, LogOut, MapPin, MessageCircle, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Field from "@/components/Field";
import UserAvatar from "@/components/UserAvatar";
import PageLoader from "@/components/PageLoader";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ProjectFields } from "@/pages/Collabs";
import CvView, { OpenToBadges } from "@/components/CvView";
import { fetchDetailsMap } from "@/api/details";
import { supabase, unwrap } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { PROJECT_STATUS, TASK_STATUS, label } from "@/lib/config";
import { cleanSearch, cn, errorMessage, formatDate } from "@/lib/utils";

const PERSON = "id, username, full_name, avatar_url";

function useProject(id) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const project = unwrap(await supabase.from("collab_projects").select(`*, owner:profiles(${PERSON})`).eq("id", id).maybeSingle());
      if (!project) return null;
      const members = unwrap(await supabase.from("collab_members").select(`user_id, role, status, instrument, note, created_at, profile:profiles(${PERSON})`)
        .eq("project_id", id).order("created_at"));
      return { ...project, members };
    },
  });
}

function Tasks({ projectId, members }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("none");
  const [due, setDue] = useState("");
  const key = ["tasks", projectId];
  const active = members.filter((m) => m.status === "active");

  const { data: tasks = [] } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await supabase.from("collab_tasks").select(`*, assignee:profiles!collab_tasks_assignee_id_fkey(${PERSON})`).eq("project_id", projectId).order("created_at")),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const onErr = (e) => toast.error(errorMessage(e));

  const add = useMutation({
    mutationFn: async () => unwrap(await supabase.from("collab_tasks").insert({
      project_id: projectId, title: title.trim(), created_by: user.id,
      assignee_id: assignee === "none" ? null : assignee, due_date: due || null,
    })),
    onSuccess: () => { setTitle(""); setDue(""); setAssignee("none"); refresh(); },
    onError: onErr,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...values }) => unwrap(await supabase.from("collab_tasks").update(values).eq("id", id)),
    onSuccess: refresh, onError: onErr,
  });
  const remove = useMutation({
    mutationFn: async (id) => unwrap(await supabase.from("collab_tasks").delete().eq("id", id)),
    onSuccess: refresh, onError: onErr,
  });

  return (
    <Card className="p-4">
      <h2 className="mb-3 font-semibold">משימות</h2>
      <form className="mb-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (title.trim()) add.mutate(); }}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="משימה חדשה, למשל: להקליט גיטרות" className="min-w-[200px] flex-1" aria-label="משימה חדשה" />
        <Select value={assignee} onValueChange={setAssignee} dir="rtl">
          <SelectTrigger className="w-40" aria-label="אחראי/ת"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">ללא אחראי/ת</SelectItem>
            {active.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.profile?.full_name || m.profile?.username}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-40" aria-label="תאריך יעד" />
        <Button type="submit" disabled={!title.trim() || add.isPending}><Plus />הוספה</Button>
      </form>
      <div className="grid gap-3 md:grid-cols-3">
        {TASK_STATUS.map((s) => (
          <div key={s.value} className="rounded-lg bg-muted/60 p-2">
            <h3 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">{s.label} ({tasks.filter((t) => t.status === s.value).length})</h3>
            <ul className="space-y-2">
              {tasks.filter((t) => t.status === s.value).map((t) => (
                <li key={t.id} className="group rounded-md border bg-card p-2.5 text-sm shadow-sm">
                  <div className="flex items-start gap-2">
                    <span className={cn("flex-1 break-words", t.status === "done" && "text-muted-foreground line-through")}>{t.title}</span>
                    <button onClick={() => remove.mutate(t.id)} aria-label="מחיקת משימה" className="text-muted-foreground opacity-0 hover:text-destructive focus:opacity-100 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    {t.assignee && <><UserAvatar profile={t.assignee} size="xs" /><span className="truncate">{t.assignee.full_name || t.assignee.username}</span></>}
                    {t.due_date && <span className="ms-auto">עד {formatDate(t.due_date, "d.M")}</span>}
                  </div>
                  <Select value={t.status} onValueChange={(v) => update.mutate({ id: t.id, status: v })} dir="rtl">
                    <SelectTrigger className="mt-2 h-7 text-xs" aria-label="סטטוס"><SelectValue /></SelectTrigger>
                    <SelectContent>{TASK_STATUS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

function InviteDialog({ projectId, open, onOpenChange, existing }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const term = cleanSearch(q);
  const { data: results = [] } = useQuery({
    queryKey: ["invite-search", term],
    enabled: term.length >= 2,
    queryFn: async () => unwrap(await supabase.from("profiles").select(PERSON)
      .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`).eq("onboarding_completed", true).limit(8)),
  });
  const invite = useMutation({
    mutationFn: async (userId) => unwrap(await supabase.from("collab_members").insert({ project_id: projectId, user_id: userId, status: "invited" })),
    onSuccess: () => { toast.success("ההזמנה נשלחה"); qc.invalidateQueries({ queryKey: ["project", projectId] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>הזמנת מוזיקאים לפרויקט</DialogTitle></DialogHeader>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם או שם משתמש" aria-label="חיפוש משתמשים" />
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {results.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <UserAvatar profile={p} />
              <span className="flex-1 truncate">{p.full_name || p.username} <span className="ltr text-xs text-muted-foreground">@{p.username}</span></span>
              {existing.has(p.id) ? <span className="text-xs text-muted-foreground">כבר בפרויקט</span>
                : <Button size="sm" variant="outline" onClick={() => invite.mutate(p.id)} disabled={invite.isPending}>הזמנה</Button>}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export default function CollabView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: p, isLoading } = useProject(id);
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [join, setJoin] = useState({ instrument: "", note: "" });
  const [inviteOpen, setInviteOpen] = useState(false);

  const applicantIds = (p?.members ?? []).filter((m) => m.status !== "active" || m.role !== "owner").map((m) => m.user_id);
  const { data: cvs = {} } = useQuery({
    queryKey: ["project-cvs", id, applicantIds.join(",")],
    enabled: Boolean(p && user && applicantIds.length),
    queryFn: () => fetchDetailsMap(applicantIds),
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["project", id] }); qc.invalidateQueries({ queryKey: ["projects"] }); };
  const onErr = (e) => toast.error(errorMessage(e));
  const memberOp = useMutation({
    mutationFn: async ({ op, userId, values }) => {
      const q = supabase.from("collab_members");
      if (op === "insert") return unwrap(await q.insert({ project_id: id, user_id: userId, ...values }));
      if (op === "update") return unwrap(await q.update(values).eq("project_id", id).eq("user_id", userId));
      return unwrap(await q.delete().eq("project_id", id).eq("user_id", userId));
    },
    onSuccess: refresh, onError: onErr,
  });
  const saveProject = useMutation({
    mutationFn: async () => {
      const { title, description, type, status, genres, looking_for_roles, location, is_remote, is_public } = edit;
      unwrap(await supabase.from("collab_projects").update({ title: title.trim(), description: description.trim(), type, status, genres, looking_for_roles, location, is_remote, is_public }).eq("id", id));
    },
    onSuccess: () => { toast.success("נשמר"); setEditOpen(false); refresh(); },
    onError: onErr,
  });
  const deleteProject = useMutation({
    mutationFn: async () => unwrap(await supabase.from("collab_projects").delete().eq("id", id)),
    onSuccess: () => { toast.success("הפרויקט נמחק"); qc.invalidateQueries({ queryKey: ["projects"] }); navigate("/collabs"); },
    onError: onErr,
  });

  if (isLoading) return <PageLoader />;
  if (!p) return <div className="page"><EmptyState title="הפרויקט לא נמצא" text="ייתכן שהוא נמחק או שהוא פרטי." /></div>;

  const me = p.members.find((m) => m.user_id === user?.id);
  const isOwner = p.owner_id === user?.id;
  const isMember = me?.status === "active";
  const active = p.members.filter((m) => m.status === "active");
  const requests = p.members.filter((m) => m.status === "requested");
  const invited = p.members.filter((m) => m.status === "invited");

  const messageOwner = async () => {
    const { data, error } = await supabase.rpc("start_conversation", { other_user: p.owner_id });
    if (error) return onErr(error);
    navigate(`/messages/${data}`);
  };

  return (
    <div className="page space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {p.is_public ? <Globe className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
              {label("projectTypes", p.type)}, {label("projectStatus", p.status)}
            </div>
            <h1 className="mt-1 text-2xl font-bold">{p.title}</h1>
            <Link to={`/u/${p.owner?.username}`} className="mt-2 inline-flex items-center gap-2 text-sm hover:underline">
              <UserAvatar profile={p.owner} size="xs" />{p.owner?.full_name || p.owner?.username}
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {!user && <Button asChild><Link to={`/signup`}>הצטרפו כדי להשתתף</Link></Button>}
            {user && !me && p.is_public && <Button onClick={() => setJoinOpen(true)}><UserPlus />בקשת הצטרפות</Button>}
            {me?.status === "requested" && (
              <Button variant="outline" onClick={() => memberOp.mutate({ op: "delete", userId: user.id })}>ביטול הבקשה</Button>
            )}
            {me?.status === "invited" && (
              <>
                <Button onClick={() => memberOp.mutate({ op: "update", userId: user.id, values: { status: "active" } })}><Check />קבלת ההזמנה</Button>
                <Button variant="outline" onClick={() => memberOp.mutate({ op: "delete", userId: user.id })}>דחייה</Button>
              </>
            )}
            {user && !isOwner && <Button variant="outline" onClick={messageOwner}><MessageCircle />הודעה למנהל/ת</Button>}
            {isMember && !isOwner && (
              <ConfirmDialog trigger={<Button variant="ghost"><LogOut />עזיבה</Button>} title="לעזוב את הפרויקט?" confirmLabel="עזיבה" destructive
                onConfirm={() => memberOp.mutate({ op: "delete", userId: user.id })} />
            )}
            {isOwner && (
              <>
                <Button variant="outline" onClick={() => { setEdit({ ...p }); setEditOpen(true); }}><Pencil />עריכה</Button>
                <ConfirmDialog trigger={<Button variant="ghost" className="text-destructive"><Trash2 />מחיקה</Button>}
                  title="למחוק את הפרויקט?" description="כל המשימות והחברים בפרויקט יימחקו. אי אפשר לבטל." confirmLabel="מחיקה" destructive
                  onConfirm={() => deleteProject.mutate()} />
              </>
            )}
          </div>
        </div>
        {me?.status === "requested" && <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">הבקשה שלכם נשלחה וממתינה לאישור.</p>}
        {p.description && <p className="mt-4 whitespace-pre-wrap break-words">{p.description}</p>}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {p.looking_for_roles.map((r) => <span key={r} className="chip border-primary/30 text-primary">מחפשים: {label("roles", r)}</span>)}
          {p.genres.map((g) => <span key={g} className="chip">{label("genres", g)}</span>)}
          {p.is_remote ? <span className="chip">אפשר מרחוק</span> : p.location && <span className="chip"><MapPin className="me-1 h-3 w-3" aria-hidden />{p.location}</span>}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          {isMember ? <Tasks projectId={id} members={p.members} /> : (
            <Card className="p-5 text-center text-sm text-muted-foreground">המשימות של הפרויקט גלויות רק לחברי הפרויקט.</Card>
          )}
        </div>
        <aside className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center">
              <h2 className="font-semibold">חברי הפרויקט ({active.length})</h2>
              {isOwner && <Button size="sm" variant="ghost" className="ms-auto" onClick={() => setInviteOpen(true)}><UserPlus />הזמנה</Button>}
            </div>
            <ul className="space-y-2.5">
              {active.map((m) => (
                <li key={m.user_id} className="flex items-center gap-2">
                  <Link to={`/u/${m.profile?.username}`}><UserAvatar profile={m.profile} /></Link>
                  <div className="min-w-0 flex-1 text-sm">
                    <Link to={`/u/${m.profile?.username}`} className="block truncate font-medium hover:underline">{m.profile?.full_name || m.profile?.username}</Link>
                    <span className="block truncate text-xs text-muted-foreground">{m.role === "owner" ? "מנהל/ת" : cvs[m.user_id]?.headline || m.instrument || "חבר/ה"}</span>
                  </div>
                  {isOwner && m.role !== "owner" && (
                    <ConfirmDialog trigger={<Button size="icon" variant="ghost" className="h-7 w-7" aria-label="הסרה מהפרויקט"><X /></Button>}
                      title="להסיר מהפרויקט?" confirmLabel="הסרה" destructive onConfirm={() => memberOp.mutate({ op: "delete", userId: m.user_id })} />
                  )}
                </li>
              ))}
            </ul>
            {isOwner && invited.length > 0 && <p className="mt-3 text-xs text-muted-foreground">הוזמנו וממתינים: {invited.map((m) => m.profile?.full_name || m.profile?.username).join(", ")}</p>}
          </Card>
          {isOwner && requests.length > 0 && (
            <Card className="p-4">
              <h2 className="mb-3 font-semibold">בקשות הצטרפות ({requests.length})</h2>
              <ul className="space-y-3">
                {requests.map((m) => (
                  <li key={m.user_id} className="space-y-3 rounded-xl border border-ink/10 p-3">
                    <Link to={`/u/${m.profile?.username}`} className="flex items-center gap-2 hover:underline">
                      <UserAvatar profile={m.profile} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{m.profile?.full_name || m.profile?.username}</span>
                        {cvs[m.user_id]?.headline && <span className="block truncate text-xs text-muted-foreground">{cvs[m.user_id].headline}</span>}
                      </span>
                    </Link>
                    {m.instrument && <p className="text-xs text-muted-foreground">מציע/ה: {m.instrument}</p>}
                    {m.note && <p className="whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm">{m.note}</p>}
                    {cvs[m.user_id] && <><OpenToBadges openTo={cvs[m.user_id].open_to} /><CvView cv={cvs[m.user_id]} compact /></>}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => memberOp.mutate({ op: "update", userId: m.user_id, values: { status: "active" } })}><Check />אישור</Button>
                      <Button size="sm" variant="outline" onClick={() => memberOp.mutate({ op: "delete", userId: m.user_id })}>דחייה</Button>
                      <Button asChild size="sm" variant="ghost"><Link to={`/u/${m.profile?.username}`}>לפרופיל המלא</Link></Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>בקשת הצטרפות ל"{p.title}"</DialogTitle></DialogHeader>
          <Field id="inst" label="מה תביאו לפרויקט?"><Input id="inst" value={join.instrument} onChange={(e) => setJoin({ ...join, instrument: e.target.value })} maxLength={60} placeholder="לדוגמה: בס, מיקס, כתיבה" /></Field>
          <Field id="note" label="כמה מילים למנהל/ת הפרויקט"><Textarea id="note" value={join.note} onChange={(e) => setJoin({ ...join, note: e.target.value })} maxLength={500} rows={3} /></Field>
          <DialogFooter>
            <Button disabled={memberOp.isPending} onClick={() => memberOp.mutate(
              { op: "insert", userId: user.id, values: { status: "requested", instrument: join.instrument.trim(), note: join.note.trim() } },
              { onSuccess: () => { setJoinOpen(false); toast.success("הבקשה נשלחה"); } },
            )}>שליחת בקשה</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isOwner && edit && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
            <DialogHeader><DialogTitle>עריכת פרויקט</DialogTitle></DialogHeader>
            <Field id="status" label="סטטוס">
              <Select value={edit.status} onValueChange={(v) => setEdit({ ...edit, status: v })} dir="rtl">
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>{PROJECT_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <ProjectFields value={edit} onChange={setEdit} />
            <DialogFooter><Button onClick={() => saveProject.mutate()} disabled={edit.title.trim().length < 2 || saveProject.isPending}>שמירה</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {isOwner && <InviteDialog projectId={id} open={inviteOpen} onOpenChange={setInviteOpen} existing={new Set(p.members.map((m) => m.user_id))} />}
    </div>
  );
}
