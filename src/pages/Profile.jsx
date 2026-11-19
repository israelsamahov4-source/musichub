import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Briefcase, ExternalLink, Flag, Handshake, MapPin, MessageCircle, MoreHorizontal, Music, Pencil } from "lucide-react";
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
import CvView from "@/components/CvView";
import { fetchDetails } from "@/api/details";
import { MEMBER_PROFILE_COLS, PUBLIC_PROFILE_COLS } from "@/api/profiles";
import { supabase, unwrap } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { label } from "@/lib/config";
import { errorMessage, formatDate, safeUrl, textDir } from "@/lib/utils";
import { useAuthHref } from "@/auth/returnTo";
import { usePageTitle } from "@/lib/usePageTitle";
import LoadError from "@/components/LoadError";

function Stat({ value, text }) {
  return (
    <span className="text-sm text-muted-foreground"><span className="tabular font-bold text-foreground">{value ?? "–"}</span> {text}</span>
  );
}

/** Without a cover photo: the brand blue with a few sound-wave lines drawn across it. */
function Cover({ coverUrl }) {
  if (safeUrl(coverUrl)) {
    return <div className="h-32 bg-muted sm:h-48"><img src={safeUrl(coverUrl)} alt="" className="h-full w-full object-cover" /></div>;
  }
  const waves = [0, 1, 2, 3, 4].map((i) => {
    const y = 40 + i * 22, a = 10 + i * 4, f = 0.012 + i * 0.002;
    const d = Array.from({ length: 121 }, (_, k) => `${k ? "L" : "M"}${k * 10},${(y + a * Math.sin(k * 10 * f + i)).toFixed(1)}`).join(" ");
    return <path key={i} d={d} fill="none" stroke={i === 2 ? "#FF4F81" : "#fff"} strokeOpacity={i === 2 ? 0.85 : 0.14 + i * 0.03} strokeWidth={i === 2 ? 2.5 : 1.5} />;
  });
  return (
    <div className="relative h-32 overflow-hidden bg-riso-blue sm:h-48" aria-hidden>
      <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">{waves}</svg>
    </div>
  );
}

function ChipGroup({ title, items, group }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-[13px] font-semibold text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap gap-1.5">{items.map((i) => <span key={i} className="chip">{label(group, i)}</span>)}</div>
    </div>
  );
}

function Section({ title, children, action }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3"><h2 className="text-lg font-bold">{title}</h2>{action && <div className="ms-auto">{action}</div>}</div>
      {children}
    </Card>
  );
}

export default function Profile() {
  const signupHref = useAuthHref("/signup");
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);

  const { data: p, isLoading, isError, refetch } = useQuery({
    queryKey: ["profile", "by-username", username, Boolean(user)],
    queryFn: async () => unwrap(await supabase.from("profiles").select(user ? MEMBER_PROFILE_COLS : PUBLIC_PROFILE_COLS)
      .eq("username", username.toLowerCase()).maybeSingle()),
  });
  usePageTitle(p ? (p.full_name || p.username) : null);

  const { data: stats } = useQuery({
    queryKey: ["profile-stats", p?.id],
    enabled: Boolean(p && user),
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
  if (isError) return <div className="page"><LoadError onRetry={refetch} /></div>;
  if (!p) return <div className="page"><EmptyState title="המשתמש לא נמצא" text="אולי שם המשתמש השתנה?" /></div>;

  const mine = user?.id === p.id;
  const roles = (Array.isArray(p.musical_roles) ? p.musical_roles : []).map((r) => r?.role).filter((r) => typeof r === "string");
  const level = p.musical_roles?.[0]?.level;
  const links = LINK_FIELDS.map((l) => ({ ...l, url: safeUrl(p.links?.[l.key]) })).filter((l) => l.url);

  const message = async () => {
    const { data, error } = await supabase.rpc("start_conversation", { other_user: p.id });
    if (error) return toast.error(errorMessage(error));
    await qc.invalidateQueries({ queryKey: ["conversations"] });
    navigate(`/messages/${data}`);
  };
  const block = async () => {
    const { error } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: p.id });
    if (error) return toast.error(errorMessage(error));
    await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", p.id);
    toast.success("המשתמש נחסם. אפשר לבטל בהגדרות.");
    qc.invalidateQueries();
  };

  const name = p.full_name || p.username;
  const actions = (
    <>
              {mine ? (
                <Button asChild variant="outline"><Link to="/profile/edit"><Pencil />עריכת פרופיל</Link></Button>
              ) : user ? (
                <>
                  <FollowButton profileId={p.id} size="default" />
                  <Button variant="outline" onClick={message}><MessageCircle />הודעה</Button>
                  <DropdownMenu dir="rtl">
                    <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="אפשרויות נוספות"><MoreHorizontal /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setReportOpen(true)}><Flag className="h-4 w-4" />דיווח</DropdownMenuItem>
                      <ConfirmDialog
                        trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Ban className="h-4 w-4" />חסימה</DropdownMenuItem>}
                        title={`לחסום את ${name}?`}
                        description="לא תוכלו לשלוח הודעות זה לזה, והפוסטים שלהם לא יופיעו אצלכם."
                        confirmLabel="חסימה" destructive onConfirm={block}
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button asChild><Link to={signupHref}>הצטרפו כדי לעקוב</Link></Button>
              )}
    </>
  );
  const roleLine = [...roles.map((r) => label("roles", r)), ...(p.instruments || []).slice(0, 2).map((i) => label("instruments", i))].join(" · ");
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-0 pb-6 sm:px-4 sm:py-6 md:py-8">
      <Card className="overflow-hidden rounded-none border-x-0 sm:rounded-2xl sm:border-x">
        <Cover coverUrl={p.cover_url} />
        <div className="px-4 pb-5 sm:px-6">
          <div className="flex items-end justify-between gap-3">
            <UserAvatar profile={p} size="xl" className="-mt-14 h-24 w-24 text-2xl ring-4 ring-card sm:-mt-20 sm:h-36 sm:w-36 sm:text-4xl" />
            <div className="hidden flex-wrap justify-end gap-2 pt-3 sm:flex">{actions}</div>
          </div>
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight sm:text-[2rem]">{name}</h1>
              <PlanBadge tier={p.plan_tier} />
            </div>
            <p className="mt-0.5 text-[15px] text-foreground/85">{cv?.headline || roleLine || (p.user_type === "listener" ? "חובב/ת מוזיקה" : "מוזיקאי/ת")}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="ltr">@{p.username}</span>
              {p.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{p.location}</span>}
              {level && <span>{label("levels", level)}</span>}
              <span>הצטרף/ה ב{formatDate(p.created_at, "MMMM yyyy")}</span>
            </div>
            {user && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                <Stat value={stats?.followers} text="עוקבים" />
                <Stat value={stats?.following} text="נעקבים" />
                <Stat value={stats?.posts} text="פוסטים" />
              </div>
            )}
            <div className="mt-4 flex gap-2 sm:hidden [&>*]:flex-1 [&>*:last-child:not(:first-child)]:flex-none">{actions}</div>
            {p.looking_for?.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#FFF0F4] px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-[#8E1840]"><Handshake className="h-4 w-4" aria-hidden />מחפש/ת</span>
                {p.looking_for.map((v) => <span key={v} className="rounded-full bg-card px-2.5 py-0.5 text-[13px] font-medium text-[#8E1840] shadow-[inset_0_0_0_1px_rgb(255_79_129/0.3)]">{label("lookingFor", v)}</span>)}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid items-start gap-4 px-4 sm:px-0 lg:grid-cols-[minmax(0,1fr)_300px]">
        <aside className="space-y-4 lg:order-last">
          <Card className="space-y-4 p-5">
            <h2 className="text-lg font-bold">קצת עליי</h2>
            {p.bio && <p dir={textDir(p.bio)} className="whitespace-pre-wrap break-words text-start text-[15px] leading-relaxed">{p.bio}</p>}
            <ChipGroup title="כלי נגינה" items={p.instruments} group="instruments" />
            <ChipGroup title="ז'אנרים" items={p.genres} group="genres" />
            {links.length > 0 && (
              <div className="space-y-1 border-t border-border/70 pt-3">
                {links.map((l) => (
                  <a key={l.key} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-primary hover:bg-muted">
                    <ExternalLink className="h-4 w-4" aria-hidden />{l.label}
                  </a>
                ))}
              </div>
            )}
            {!user && <p className="text-sm text-muted-foreground"><Link to={signupHref} className="font-semibold text-primary hover:underline">הצטרפו</Link> כדי לראות את הפרופיל המלא.</p>}
            {user && !p.bio && !p.instruments.length && !links.length && <p className="text-sm text-muted-foreground">עוד אין פרטים בפרופיל.</p>}
          </Card>
          {courses.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-2 text-lg font-bold">קורסים שמלמד/ת</h2>
              <ul className="-mx-2">{courses.map((c) => <li key={c.id}><Link to={`/courses/${c.id}`} className="block rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-muted">{c.title}</Link></li>)}</ul>
            </Card>
          )}
        </aside>
        <Tabs defaultValue="cv" dir="rtl" className="min-w-0">
          <TabsList className="mb-4">
            <TabsTrigger value="cv">קורות חיים</TabsTrigger>
            <TabsTrigger value="posts">פוסטים</TabsTrigger>
            <TabsTrigger value="projects">פרויקטים{projects.length > 0 && ` (${projects.length})`}</TabsTrigger>
          </TabsList>
          <TabsContent value="cv">
            {cvLoading ? null : mine && !cv?.headline && !cv?.experience?.length ? (
              <EmptyState icon={Briefcase} title="עוד לא מילאתם קורות חיים" text="ניסיון, לימודים ותיק עבודות עוזרים למנהלי פרויקטים להחליט לעבוד איתכם."
                action={<Button asChild><Link to="/profile/edit">מילוי קורות חיים</Link></Button>} />
            ) : (
              <Section title="קורות חיים מוזיקליים" action={mine && cv && (
                <span className="text-xs text-muted-foreground">גלוי ל{{ public: "כולם", members: "חברי הקהילה", applications: "מי שאתם פונים אליו" }[cv.visibility]} · <Link to="/profile/edit" className="font-semibold text-primary hover:underline">שינוי</Link></span>
              )}>
                <CvView cv={cv} hiddenText={user ? "קורות החיים של המשתמש/ת גלויים רק לאנשים שהם פונים אליהם, למשל מנהלי פרויקטים שביקשו להצטרף אליהם."
                  : "התחברו כדי לראות את קורות החיים המוזיקליים."} />
              </Section>
            )}
          </TabsContent>
          <TabsContent value="posts" className="space-y-4">
            <PostList queryKey={["author", p.id]} filters={{ authorId: p.id }} empty={<EmptyState icon={Music} title="עדיין אין פוסטים" />} />
          </TabsContent>
          <TabsContent value="projects">
            {projects.length === 0 ? <EmptyState icon={Handshake} title="אין פרויקטים פעילים" /> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {projects.map(({ project, role }) => (
                  <Link key={project.id} to={`/collabs/${project.id}`}>
                    <Card className="flex items-center gap-3 p-4 transition-shadow can-hover:hover:shadow-pop">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFE3EB] text-[#B01E4C]"><Handshake className="h-5 w-5" aria-hidden /></span>
                      <div className="min-w-0">
                        <div className="truncate font-bold">{project.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {label("projectTypes", project.type)} · {label("projectStatus", project.status)}{role === "owner" && " · מנהל/ת"}
                        </div>
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
