import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, ExternalLink, Flag, MapPin, MessageCircle, MoreHorizontal, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserAvatar from "@/components/UserAvatar";
import PlanBadge from "@/components/PlanBadge";
import FollowButton from "@/components/FollowButton";
import PostList from "@/components/PostList";
import EmptyState from "@/components/EmptyState";
import PageLoader from "@/components/PageLoader";
import ReportDialog from "@/components/ReportDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { LINK_FIELDS } from "@/components/ProfileForm";
import CvView, { OpenToBadges } from "@/components/CvView";
import { fetchDetails } from "@/api/details";
import { supabase, unwrap } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { label } from "@/lib/config";
import { errorMessage, formatDate, safeUrl } from "@/lib/utils";

function Stat({ value, text }) {
  return <div><span className="font-bold">{value ?? "–"}</span> <span className="text-muted-foreground">{text}</span></div>;
}

function ChipGroup({ title, items, group }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap gap-1.5">{items.map((i) => <span key={i} className="chip">{label(group, i)}</span>)}</div>
    </div>
  );
}

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);

  const { data: p, isLoading } = useQuery({
    queryKey: ["profile", "by-username", username],
    queryFn: async () => unwrap(await supabase.from("profiles").select("*").eq("username", username.toLowerCase()).maybeSingle()),
  });

  const { data: stats } = useQuery({
    queryKey: ["profile-stats", p?.id],
    enabled: Boolean(p),
    queryFn: async () => {
      const count = async (q) => (await q).count ?? 0;
      const [followers, following, posts] = await Promise.all([
        count(supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", p.id)),
        count(supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", p.id)),
        count(supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", p.id)),
      ]);
      return { followers, following, posts };
    },
  });

  const { data: cv, isLoading: cvLoading } = useQuery({
    queryKey: ["profile-details", p?.id, user?.id],
    enabled: Boolean(p),
    queryFn: () => fetchDetails(p.id),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["profile-projects", p?.id],
    enabled: Boolean(p),
    queryFn: async () => {
      const rows = unwrap(await supabase.from("collab_members").select("role, project:collab_projects(id, title, type, status, is_public)")
        .eq("user_id", p.id).eq("status", "active"));
      return rows.filter((r) => r.project);
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["profile-courses", p?.id],
    enabled: Boolean(p),
    queryFn: async () => unwrap(await supabase.from("courses").select("id, title, category, level").eq("instructor_id", p.id).eq("is_published", true)),
  });

  if (isLoading) return <PageLoader />;
  if (!p) return <div className="page"><EmptyState title="המשתמש לא נמצא" text="אולי שם המשתמש השתנה?" /></div>;

  const mine = user?.id === p.id;
  const roles = (p.musical_roles || []).map((r) => r.role);
  const level = p.musical_roles?.[0]?.level;
  const links = LINK_FIELDS.map((l) => ({ ...l, url: safeUrl(p.links?.[l.key]) })).filter((l) => l.url);

  const message = async () => {
    const { data, error } = await supabase.rpc("start_conversation", { other_user: p.id });
    if (error) return toast.error(errorMessage(error));
    navigate(`/messages/${data}`);
  };
  const block = async () => {
    const { error } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: p.id });
    if (error) return toast.error(errorMessage(error));
    await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", p.id);
    toast.success("המשתמש נחסם. אפשר לבטל בהגדרות.");
    qc.invalidateQueries();
  };

  return (
    <div className="page space-y-6">
      <Card className="overflow-hidden">
        <div className="grain relative h-28 overflow-hidden bg-riso-blue sm:h-36" aria-hidden>
          <span className="absolute -end-10 -top-16 h-56 w-56 rounded-full bg-riso-pink/85 mix-blend-multiply" />
          <span className="absolute end-36 top-6 h-16 w-16 rounded-full bg-riso-yellow/90 mix-blend-multiply" />
        </div>
        <div className="px-5 pb-5">
          <div className="-mt-12 flex flex-wrap items-end gap-4">
            <UserAvatar profile={p} size="xl" className="ring-4 ring-card" />
            <div className="ms-auto flex flex-wrap gap-2 pt-14">
              {mine ? (
                <Button asChild variant="outline"><Link to="/profile/edit"><Pencil />עריכת פרופיל</Link></Button>
              ) : user ? (
                <>
                  <FollowButton profileId={p.id} size="default" />
                  <Button variant="outline" onClick={message}><MessageCircle />הודעה</Button>
                  <DropdownMenu dir="rtl">
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="אפשרויות נוספות"><MoreHorizontal /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setReportOpen(true)}><Flag className="h-4 w-4" />דיווח</DropdownMenuItem>
                      <ConfirmDialog
                        trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Ban className="h-4 w-4" />חסימה</DropdownMenuItem>}
                        title={`לחסום את ${p.full_name || p.username}?`}
                        description="לא תוכלו לשלוח הודעות זה לזה, והפוסטים שלהם לא יופיעו אצלכם."
                        confirmLabel="חסימה" destructive onConfirm={block}
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button asChild><Link to={`/signup`}>הצטרפו כדי לעקוב</Link></Button>
              )}
            </div>
          </div>
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-6xl font-bold leading-[0.9]">{p.full_name || p.username}</h1>
              <PlanBadge tier={p.plan_tier} />
            </div>
            {cv?.headline && <p className="mt-1 text-lg font-medium text-ink/85">{cv.headline}</p>}
            <p className="ltr w-fit text-sm text-muted-foreground">@{p.username}</p>
            {cv?.open_to?.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-sm font-medium">פתוח/ה ל:</span><OpenToBadges openTo={cv.open_to} /></div>}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {roles.length > 0 && <span>{roles.map((r) => label("roles", r)).join(", ")}{level && `, ${label("levels", level)}`}</span>}
              {p.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{p.location}</span>}
              <span>הצטרף/ה ב{formatDate(p.created_at, "MMMM yyyy")}</span>
            </div>
            <div className="mt-3 flex gap-5 text-sm">
              <Stat value={stats?.followers} text="עוקבים" />
              <Stat value={stats?.following} text="נעקבים" />
              <Stat value={stats?.posts} text="פוסטים" />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <Card className="space-y-4 p-4">
            {p.open_for_collaboration && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">פתוח/ה לשיתופי פעולה</p>}
            {p.bio && <p className="whitespace-pre-wrap break-words text-sm">{p.bio}</p>}
            <ChipGroup title="כלי נגינה" items={p.instruments} group="instruments" />
            <ChipGroup title="ז'אנרים" items={p.genres} group="genres" />
            <ChipGroup title="מחפש/ת" items={p.looking_for} group="lookingFor" />
            {links.length > 0 && (
              <div className="space-y-1.5">
                {links.map((l) => (
                  <a key={l.key} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />{l.label}
                  </a>
                ))}
              </div>
            )}
            {!p.bio && !p.instruments.length && !links.length && <p className="text-sm text-muted-foreground">עוד אין פרטים בפרופיל.</p>}
          </Card>
          {courses.length > 0 && (
            <Card className="p-4">
              <h2 className="mb-2 font-semibold">קורסים</h2>
              <ul className="space-y-1.5">{courses.map((c) => <li key={c.id}><Link to={`/courses/${c.id}`} className="text-sm hover:underline">{c.title}</Link></li>)}</ul>
            </Card>
          )}
        </aside>
        <Tabs defaultValue="cv" dir="rtl" className="min-w-0">
          <TabsList className="mb-4">
            <TabsTrigger value="cv">קורות חיים</TabsTrigger>
            <TabsTrigger value="posts">פוסטים</TabsTrigger>
            <TabsTrigger value="projects">פרויקטים ({projects.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="cv">
            <Card className="p-5 sm:p-6">
              {cvLoading ? null : mine && !cv?.headline && !cv?.experience?.length ? (
                <EmptyState title="עוד לא מילאתם קורות חיים" text="ניסיון, לימודים ותיק עבודות עוזרים למנהלי פרויקטים להחליט לעבוד איתכם."
                  action={<Button asChild><Link to="/profile/edit">מילוי קורות חיים</Link></Button>} />
              ) : (
                <CvView cv={cv} hiddenText={user ? "הקורות חיים של המשתמש/ת גלויים רק לאנשים שהם פונים אליהם, למשל מנהלי פרויקטים שביקשו להצטרף אליהם."
                  : "התחברו כדי לראות את קורות החיים המוזיקליים."} />
              )}
              {mine && cv && <p className="mt-6 text-xs text-muted-foreground">מי רואה את זה: {{ public: "כולם", members: "חברי הקהילה", applications: "רק מי שאתם פונים אליו" }[cv.visibility]}. <Link to="/profile/edit" className="text-primary underline">שינוי</Link></p>}
            </Card>
          </TabsContent>
          <TabsContent value="posts">
            <PostList queryKey={["author", p.id]} filters={{ authorId: p.id }} empty={<EmptyState title="עדיין אין פוסטים" />} />
          </TabsContent>
          <TabsContent value="projects">
            {projects.length === 0 ? <EmptyState title="אין פרויקטים פעילים" /> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {projects.map(({ project, role }) => (
                  <Link key={project.id} to={`/collabs/${project.id}`}>
                    <Card className="p-4 transition-shadow hover:shadow-md">
                      <div className="font-semibold">{project.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {label("projectTypes", project.type)}, {label("projectStatus", project.status)}{role === "owner" && ", מנהל/ת"}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      {user && !mine && <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="profile" targetId={p.id} />}
    </div>
  );
}
