import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Check, ExternalLink, GraduationCap, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserAvatar from "@/components/UserAvatar";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import PageHeader from "@/components/PageHeader";
import NotFound from "@/pages/NotFound";
import { supabase, unwrap } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { cleanSearch, errorMessage, formatDate, timeAgo } from "@/lib/utils";

const TYPE = { post: "פוסט", comment: "תגובה", message: "הודעה פרטית", profile: "פרופיל", project: "פרויקט", course: "קורס" };
const REMOVE_LABEL = { profile: "השעיית המשתמש", course: "הסתרת הקורס" };

function Stats() {
  const { data } = useQuery({ queryKey: ["admin", "stats"], queryFn: async () => unwrap(await supabase.rpc("admin_stats")) });
  const items = [
    ["משתמשים", data?.users], ["חדשים השבוע", data?.users_7d], ["פוסטים", data?.posts],
    ["פרויקטים", data?.projects], ["קורסים מפורסמים", data?.courses], ["מנויים משלמים", data?.paying],
    ["דיווחים פתוחים", data?.open_reports],
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 sm:grid-cols-4 lg:grid-cols-7">
      {items.map(([label, value]) => (
        <div key={label} className="bg-white p-4">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="font-display text-4xl font-bold leading-none">{value ?? "–"}</dd>
        </div>
      ))}
    </dl>
  );
}

function Reports() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("open");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "reports", status],
    queryFn: async () => unwrap(await supabase.rpc("admin_reports", { p_status: status })),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const remove = useMutation({
    mutationFn: async (id) => unwrap(await supabase.rpc("admin_remove_reported", { p_report: id })),
    onSuccess: () => { toast.success("טופל"); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const dismiss = useMutation({
    mutationFn: async (id) => unwrap(await supabase.from("reports").update({ status: "dismissed" }).eq("id", id)),
    onSuccess: () => { toast.success("הדיווח נסגר"); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[["open", "פתוחים"], ["all", "כל הדיווחים"]].map(([v, l]) => (
          <Button key={v} size="sm" variant={status === v ? "default" : "outline"} onClick={() => setStatus(v)}>{l}</Button>
        ))}
      </div>
      {!isLoading && data.length === 0 && <EmptyState icon={Check} title="אין דיווחים פתוחים" text="כשמשתמשים ידווחו על תוכן, הוא יופיע כאן." />}
      {data.map((r) => (
        <Card key={r.id} className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-riso-pink/15 px-2.5 py-0.5 font-semibold text-[#B3123F]">{TYPE[r.target_type]}</span>
            {r.status !== "open" && <span className="chip">{r.status === "reviewed" ? "טופל" : "נסגר"}</span>}
            <span className="text-muted-foreground">דווח {timeAgo(r.created_at)} על ידי <span className="ltr">@{r.reporter_username}</span></span>
          </div>
          <p><span className="font-semibold">סיבה: </span>{r.reason}</p>
          {r.target_text != null ? (
            <blockquote className="whitespace-pre-wrap break-words rounded-xl border-s-4 border-riso-pink bg-muted px-4 py-3 text-sm">
              {r.target_text}
              {r.target_owner_username && <footer className="mt-2 text-xs text-muted-foreground">מאת <Link className="ltr underline" to={`/u/${r.target_owner_username}`}>@{r.target_owner_username}</Link></footer>}
            </blockquote>
          ) : <p className="text-sm text-muted-foreground">התוכן כבר לא קיים.</p>}
          {r.status === "open" && (
            <div className="flex flex-wrap gap-2">
              {r.target_text != null && (
                <ConfirmDialog
                  trigger={<Button size="sm" variant="destructive">{r.target_type === "profile" ? <Ban /> : <Trash2 />}{REMOVE_LABEL[r.target_type] ?? "מחיקת התוכן"}</Button>}
                  title="לטפל בדיווח?" description={r.target_type === "profile" ? "המשתמש לא יוכל לפרסם, להגיב או לשלוח הודעות עד שתבטלו את ההשעיה." : "התוכן יוסר לצמיתות."}
                  confirmLabel="אישור" destructive onConfirm={() => remove.mutate(r.id)} />
              )}
              <Button size="sm" variant="outline" onClick={() => dismiss.mutate(r.id)}><X />סגירה בלי פעולה</Button>
              {r.target_link && <Button asChild size="sm" variant="ghost"><Link to={r.target_link}><ExternalLink />צפייה</Link></Button>}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function Users() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const term = cleanSearch(q);
  const { data = [] } = useQuery({
    queryKey: ["admin", "users", term],
    queryFn: async () => unwrap(await supabase.rpc("admin_find_users", { p_query: term })),
  });
  const setFlags = useMutation({
    mutationFn: async (args) => unwrap(await supabase.rpc("admin_set_flags", args)),
    onSuccess: () => { toast.success("עודכן"); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם או שם משתמש" className="ps-9" aria-label="חיפוש משתמשים" />
      </div>
      <Card className="divide-y">
        {data.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 p-3">
            <UserAvatar profile={u} />
            <div className="min-w-0 flex-1">
              <Link to={`/u/${u.username}`} className="font-medium hover:underline">{u.full_name || u.username}</Link>
              <p className="text-xs text-muted-foreground"><span className="ltr">@{u.username}</span>, הצטרף/ה ב-{formatDate(u.created_at, "d.M.yyyy")}{u.plan_tier !== "free" && `, ${u.plan_tier}`}</p>
            </div>
            {u.is_suspended && <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">מושעה</span>}
            <Button size="sm" variant={u.is_instructor ? "secondary" : "outline"} onClick={() => setFlags.mutate({ p_user: u.id, p_instructor: !u.is_instructor })}>
              <GraduationCap />{u.is_instructor ? "מורה" : "אישור כמורה"}
            </Button>
            <Button size="sm" variant={u.is_suspended ? "outline" : "ghost"} className={u.is_suspended ? "" : "text-destructive"}
              onClick={() => setFlags.mutate({ p_user: u.id, p_suspended: !u.is_suspended })}>
              <Ban />{u.is_suspended ? "ביטול השעיה" : "השעיה"}
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}

export default function Admin() {
  const { profile } = useAuth();
  if (!profile?.is_admin) return <NotFound />;
  return (
    <div>
      <PageHeader title="ניהול" text="דיווחים, משתמשים ומספרים. רק מנהלים רואים את העמוד הזה." />
      <div className="page space-y-6">
        <Stats />
        <Tabs defaultValue="reports" dir="rtl">
          <TabsList className="mb-4">
            <TabsTrigger value="reports">דיווחים</TabsTrigger>
            <TabsTrigger value="users">משתמשים</TabsTrigger>
          </TabsList>
          <TabsContent value="reports"><Reports /></TabsContent>
          <TabsContent value="users"><Users /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
