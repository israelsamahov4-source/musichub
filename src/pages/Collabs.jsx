import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Disc3, Globe, Handshake, Lock, MapPin, Mic2, Music, PenLine, Plus, Shuffle, SlidersHorizontal, Sparkles, Users } from "lucide-react";
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
import CityPicker from "@/components/CityPicker";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import UserAvatar, { brandFor } from "@/components/UserAvatar";
import { supabase, unwrap } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { GENRES, PROJECT_TYPES, ROLES, label } from "@/lib/config";
import { errorMessage, timeAgo } from "@/lib/utils";
import { useAuthHref } from "@/auth/returnTo";
import { DIR, tr } from "@/lib/i18n";

const PROJECT_SELECT = "id, title, description, type, status, genres, looking_for_roles, location, is_remote, is_public, created_at, owner:profiles!collab_projects_owner_id_fkey(id, username, full_name, avatar_url), members:collab_members(count)";

export const EMPTY_PROJECT = { title: "", description: "", type: "single", genres: [], looking_for_roles: [], location: "", is_remote: true, is_public: true };

export function ProjectFields({ value, onChange }) {
  const set = (k) => (v) => onChange({ ...value, [k]: v?.target ? v.target.value : v });
  return (
    <div className="space-y-4">
      <Field id="title" label={tr("שם הפרויקט")}><Input id="title" value={value.title} onChange={set("title")} maxLength={120} required /></Field>
      <Field id="type" label={tr("סוג")}>
        <Select value={value.type} onValueChange={set("type")} dir={DIR}>
          <SelectTrigger id="type"><SelectValue /></SelectTrigger>
          <SelectContent>{PROJECT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field id="desc" label={tr("תיאור")} hint={tr("מה הרעיון, מה כבר קיים, ומה אתם מחפשים")}>
        <Textarea id="desc" value={value.description} onChange={set("description")} maxLength={5000} rows={4} />
      </Field>
      <Field label={tr("מחפשים")}><TagPicker options={ROLES} value={value.looking_for_roles} onChange={set("looking_for_roles")} label={tr("תפקידים מבוקשים")} /></Field>
      <Field label={tr("ז'אנר")}><TagPicker options={GENRES} value={value.genres} onChange={set("genres")} max={4} label={tr("ז'אנר")} /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="loc" label={tr("עיר (לא חובה)")}><CityPicker id="loc" value={value.location} onChange={set("location")} /></Field>
        <div className="space-y-3 pt-6">
          <label className="flex items-center gap-2 text-sm"><Switch aria-label={tr("אפשר לעבוד מרחוק")} checked={value.is_remote} onCheckedChange={set("is_remote")} />{tr("אפשר לעבוד מרחוק")}</label>
          <label className="flex items-center gap-2 text-sm"><Switch aria-label={tr("פרויקט ציבורי")} checked={value.is_public} onCheckedChange={set("is_public")} />{tr("פרויקט ציבורי (כולם יכולים לראות ולבקש להצטרף)")}</label>
        </div>
      </div>
    </div>
  );
}

const TYPE_ICON = { single: Music, album: Disc3, songwriting: PenLine, production: SlidersHorizontal, remix: Shuffle, band: Users, jam: Mic2, other: Sparkles };

function ProjectCard({ p, badge }) {
  const Icon = TYPE_ICON[p.type] || Music;
  const color = brandFor(p.id);
  return (
    <Link to={`/collabs/${p.id}`} className="block">
      <Card className="flex h-full flex-col justify-between p-4 transition-shadow duration-200 can-hover:hover:shadow-pop">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: color, color: "#fff" }}>
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h3 className="flex-1 text-base font-bold leading-snug">{p.title}</h3>
              {badge}
              {!p.is_public && <Lock className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-label={tr("פרויקט פרטי")} />}
            </div>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{label("projectTypes", p.type)} · {label("projectStatus", p.status)} · {timeAgo(p.created_at)}</p>
          </div>
        </div>
        {p.description && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-foreground/80">{p.description}</p>}
        {p.looking_for_roles?.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">{tr("מחפשים")}</span>
            {p.looking_for_roles.slice(0, 4).map((r) => <span key={r} className="chip bg-[#FFE3EB] font-semibold text-[#8E1840]">{label("roles", r)}</span>)}
          </div>
        )}
        <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
          <UserAvatar profile={p.owner} size="xs" className="h-6 w-6" />
          <span className="truncate font-medium text-foreground/80">{p.owner?.full_name || p.owner?.username}</span>
          <span className="ms-auto flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden />{p.members?.[0]?.count ?? 1}</span>
          {p.is_remote ? <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" aria-hidden />{tr("מרחוק")}</span>
            : p.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{p.location}</span>}
        </div>
      </Card>
    </Link>
  );
}

const Grid = ({ loading, items, render, empty }) =>
  loading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
    : items.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(render)}</div> : empty;

export default function Collabs() {
  const signupHref = useAuthHref("/signup");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState("all");
  const [role, setRole] = useState("all");
  const filtered = type !== "all" || role !== "all";
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

  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: async () =>
      unwrap(await supabase.from("collab_projects").insert({ ...draft, title: draft.title.trim(), description: draft.description.trim(), owner_id: user.id }).select("id").single()),
    onSuccess: ({ id }) => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success(tr("הפרויקט נוצר")); setOpen(false); setDraft(EMPTY_PROJECT); navigate(`/collabs/${id}`); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const statusBadge = (s) => s === "requested" ? <span className="chip">{tr("ממתין לאישור")}</span> : s === "invited" ? <span className="chip bg-secondary text-primary">{tr("הוזמנתם")}</span> : null;

  return (
    <div>
    <PageHeader title={tr("פרויקטים")} text={tr("מצאו שותפים לשיר, ללהקה או להפקה, או הצטרפו לפרויקט קיים.")}
      actions={user ? <Button onClick={() => setOpen(true)}><Plus />{tr("פרויקט חדש")}</Button>
        : <Button asChild size="lg"><Link to={signupHref}>{tr("הצטרפו כדי ליצור פרויקט")}</Link></Button>} />
    <div className="page">
      <Tabs defaultValue="explore" dir={DIR}>
        <TabsList>
          <TabsTrigger value="explore">{tr("כל הפרויקטים")}</TabsTrigger>
          {user && <TabsTrigger value="mine">{tr("הפרויקטים שלי")}</TabsTrigger>}
        </TabsList>
        <TabsContent value="explore" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={type} onValueChange={setType} dir={DIR}>
              <SelectTrigger className="w-44" aria-label={tr("סוג פרויקט")}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">{tr("כל הסוגים")}</SelectItem>{PROJECT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={role} onValueChange={setRole} dir={DIR}>
              <SelectTrigger className="w-44" aria-label={tr("תפקיד מבוקש")}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">{tr("כל התפקידים")}</SelectItem>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Grid loading={explore.isLoading} items={explore.data ?? []} render={(p) => <ProjectCard key={p.id} p={p} />}
            empty={filtered
              ? <EmptyState icon={Handshake} title={tr("אין פרויקטים כאלה כרגע")} text={tr("נסו סוג אחר או תפקיד אחר.")}
                  action={<Button variant="outline" onClick={() => { setType("all"); setRole("all"); }}>{tr("ניקוי סינון")}</Button>} />
              : <EmptyState icon={Handshake} title={tr("הבמה עדיין ריקה")}
                  text={tr("כאן יופיעו שירים, להקות והפקות שמחפשים שותפים. פתחו את הפרויקט הראשון, ומוזיקאים יוכלו לבקש להצטרף.")}
                  action={user
                    ? <Button onClick={() => setOpen(true)}><Plus />{tr("פתיחת הפרויקט הראשון")}</Button>
                    : <Button asChild><Link to={signupHref}>{tr("הצטרפו ופתחו פרויקט")}</Link></Button>} />} />
        </TabsContent>
        {user && (
          <TabsContent value="mine">
            <Grid loading={mine.isLoading} items={mine.data ?? []} render={(r) => <ProjectCard key={r.project.id} p={r.project} badge={statusBadge(r.status)} />}
              empty={<EmptyState icon={Handshake} title={tr("עוד לא הצטרפתם לפרויקט")} text={tr("פתחו פרויקט חדש או בקשו להצטרף לפרויקט קיים.")} />} />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{tr("פרויקט חדש")}</DialogTitle></DialogHeader>
          <ProjectFields value={draft} onChange={setDraft} />
          <DialogFooter>
            <Button onClick={() => create.mutate()} disabled={draft.title.trim().length < 2 || create.isPending}>{tr("יצירת פרויקט")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
