import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Globe, Handshake, Lock, MapPin, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import Field from "@/components/Field";
import TagPicker from "@/components/TagPicker";
import EmptyState from "@/components/EmptyState";
import UserAvatar from "@/components/UserAvatar";
import { supabase, unwrap } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { GENRES, PROJECT_TYPES, ROLES, label } from "@/lib/config";
import { errorMessage, timeAgo } from "@/lib/utils";

const PROJECT_SELECT = "id, title, description, type, status, genres, looking_for_roles, location, is_remote, is_public, created_at, owner:profiles!collab_projects_owner_id_fkey(id, username, full_name, avatar_url), members:collab_members(count)";

export const EMPTY_PROJECT = { title: "", description: "", type: "single", genres: [], looking_for_roles: [], location: "", is_remote: true, is_public: true };

export function ProjectFields({ value, onChange }) {
  const set = (k) => (v) => onChange({ ...value, [k]: v?.target ? v.target.value : v });
  return (
    <div className="space-y-4">
      <Field id="title" label="שם הפרויקט"><Input id="title" value={value.title} onChange={set("title")} maxLength={120} required /></Field>
      <Field id="type" label="סוג">
        <Select value={value.type} onValueChange={set("type")} dir="rtl">
          <SelectTrigger id="type"><SelectValue /></SelectTrigger>
          <SelectContent>{PROJECT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field id="desc" label="תיאור" hint="מה הרעיון, מה כבר קיים, ומה אתם מחפשים">
        <Textarea id="desc" value={value.description} onChange={set("description")} maxLength={5000} rows={4} />
      </Field>
      <Field label="מחפשים"><TagPicker options={ROLES} value={value.looking_for_roles} onChange={set("looking_for_roles")} label="תפקידים מבוקשים" /></Field>
      <Field label="ז'אנר"><TagPicker options={GENRES} value={value.genres} onChange={set("genres")} max={4} label="ז'אנר" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="loc" label="מיקום (לא חובה)"><Input id="loc" value={value.location} onChange={set("location")} maxLength={100} /></Field>
        <div className="space-y-3 pt-6">
          <label className="flex items-center gap-2 text-sm"><Switch checked={value.is_remote} onCheckedChange={set("is_remote")} />אפשר לעבוד מרחוק</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={value.is_public} onCheckedChange={set("is_public")} />פרויקט ציבורי (כולם יכולים לראות ולבקש להצטרף)</label>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ p, badge }) {
  return (
    <Link to={`/collabs/${p.id}`} className="block">
      <Card className="flex h-full flex-col p-4 transition-shadow hover:shadow-md">
        <div className="flex items-start gap-2">
          <h3 className="flex-1 font-semibold">{p.title}</h3>
          {badge}
          {!p.is_public && <Lock className="h-4 w-4 text-muted-foreground" aria-label="פרויקט פרטי" />}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{label("projectTypes", p.type)}, {label("projectStatus", p.status)}, {timeAgo(p.created_at)}</p>
        {p.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
        {p.looking_for_roles?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-xs font-medium">מחפשים:</span>
            {p.looking_for_roles.slice(0, 4).map((r) => <span key={r} className="chip border-primary/30 text-primary">{label("roles", r)}</span>)}
          </div>
        )}
        <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-muted-foreground">
          <UserAvatar profile={p.owner} size="xs" />
          <span className="truncate">{p.owner?.full_name || p.owner?.username}</span>
          <span className="ms-auto flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden />{p.members?.[0]?.count ?? 1}</span>
          {p.is_remote ? <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" aria-hidden />מרחוק</span>
            : p.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{p.location}</span>}
        </div>
      </Card>
    </Link>
  );
}

const Grid = ({ loading, items, render, empty }) =>
  loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
    : items.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(render)}</div> : empty;

export default function Collabs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState("all");
  const [role, setRole] = useState("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_PROJECT);

  const explore = useQuery({
    queryKey: ["projects", "explore", type, role],
    queryFn: async () => {
      let q = supabase.from("collab_projects").select(PROJECT_SELECT).eq("is_public", true)
        .neq("status", "completed").eq("members.status", "active").order("created_at", { ascending: false }).limit(60);
      if (type !== "all") q = q.eq("type", type);
      if (role !== "all") q = q.contains("looking_for_roles", [role]);
      return unwrap(await q);
    },
  });

  const mine = useQuery({
    queryKey: ["projects", "mine", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const rows = unwrap(await supabase.from("collab_members").select(`status, role, project:collab_projects(${PROJECT_SELECT})`)
        .eq("user_id", user.id).eq("project.members.status", "active").order("created_at", { ascending: false }));
      return rows.filter((r) => r.project);
    },
  });

  const create = useMutation({
    mutationFn: async () =>
      unwrap(await supabase.from("collab_projects").insert({ ...draft, title: draft.title.trim(), description: draft.description.trim(), owner_id: user.id }).select("id").single()),
    onSuccess: ({ id }) => { toast.success("הפרויקט נוצר"); setOpen(false); setDraft(EMPTY_PROJECT); navigate(`/collabs/${id}`); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const statusBadge = (s) => s === "requested" ? <span className="chip">ממתין לאישור</span> : s === "invited" ? <span className="chip border-primary text-primary">הוזמנת</span> : null;

  return (
    <div className="page">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1">
          <h1 className="page-title">פרויקטים משותפים</h1>
          <p className="mt-1 text-muted-foreground">מצאו שותפים לשיר, ללהקה או להפקה, או הצטרפו לפרויקט קיים.</p>
        </div>
        {user ? <Button onClick={() => setOpen(true)}><Plus />פרויקט חדש</Button> : <Button asChild><Link to="/signup">הצטרפו כדי ליצור פרויקט</Link></Button>}
      </div>

      <Tabs defaultValue="explore" dir="rtl" className="mt-6">
        <TabsList>
          <TabsTrigger value="explore">כל הפרויקטים</TabsTrigger>
          {user && <TabsTrigger value="mine">הפרויקטים שלי</TabsTrigger>}
        </TabsList>
        <TabsContent value="explore" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={type} onValueChange={setType} dir="rtl">
              <SelectTrigger className="w-44" aria-label="סוג פרויקט"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">כל הסוגים</SelectItem>{PROJECT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={role} onValueChange={setRole} dir="rtl">
              <SelectTrigger className="w-44" aria-label="תפקיד מבוקש"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">כל התפקידים</SelectItem>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Grid loading={explore.isLoading} items={explore.data ?? []} render={(p) => <ProjectCard key={p.id} p={p} />}
            empty={<EmptyState icon={Handshake} title="אין פרויקטים שמתאימים" text="אולי זה הזמן לפתוח אחד?" />} />
        </TabsContent>
        {user && (
          <TabsContent value="mine">
            <Grid loading={mine.isLoading} items={mine.data ?? []} render={(r) => <ProjectCard key={r.project.id} p={r.project} badge={statusBadge(r.status)} />}
              empty={<EmptyState icon={Handshake} title="עוד לא הצטרפתם לפרויקט" text="פתחו פרויקט חדש או בקשו להצטרף לפרויקט קיים." />} />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>פרויקט חדש</DialogTitle></DialogHeader>
          <ProjectFields value={draft} onChange={setDraft} />
          <DialogFooter>
            <Button onClick={() => create.mutate()} disabled={draft.title.trim().length < 2 || create.isPending}>יצירת פרויקט</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
