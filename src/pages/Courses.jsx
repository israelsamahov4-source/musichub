import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Plus, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserAvatar, { brandFor } from "@/components/UserAvatar";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { supabase, unwrap } from "@/lib/supabase";
import { COURSE_CARD, canTeach } from "@/api/courses";
import { useAuth } from "@/auth/AuthProvider";
import { useAuthHref } from "@/auth/returnTo";
import { COURSE_CATEGORIES, COURSE_LEVELS, label } from "@/lib/config";
import { cleanSearch, cn, safeUrl } from "@/lib/utils";

export function CourseCard({ c, extra }) {
  const color = brandFor(c.id);
  const onColor = "text-white";
  return (
    <Link to={`/courses/${c.id}`} className="block">
      <Card className="flex h-full flex-col overflow-hidden transition-shadow duration-200 can-hover:hover:shadow-pop">
        <div className="relative aspect-[16/9] overflow-hidden" style={{ backgroundColor: color }}>
          {safeUrl(c.cover_url) ? <img src={safeUrl(c.cover_url)} alt="" loading="lazy" className="h-full w-full object-cover" />
            : (
              <div className={cn("absolute inset-0 flex items-end justify-between p-4", onColor)} aria-hidden>
                <span className="rounded-full bg-black/15 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm">{label("courseCategories", c.category)}</span>
                <GraduationCap className="h-16 w-16 opacity-25" strokeWidth={1.4} />
              </div>
            )}
          {!c.is_free && <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-riso-yellow"><Star className="h-3 w-3" aria-hidden />Pro</span>}
          {!c.is_published && <span className="absolute end-3 top-3 rounded-full bg-card px-2 py-0.5 text-xs font-bold text-[#8A5A00]">טיוטה</span>}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-2 text-base font-bold leading-snug">{c.title}</h3>
          <p className="mt-1 text-[13px] text-muted-foreground">{label("courseCategories", c.category)} · {label("courseLevels", c.level)}</p>
          <div className="mt-auto flex items-center gap-2 pt-3 text-[13px] text-muted-foreground">
            <UserAvatar profile={c.instructor} size="xs" className="h-6 w-6" />
            <span className="truncate font-medium text-foreground/80">{c.instructor?.full_name || c.instructor?.username}</span>
          </div>
          {extra}
        </div>
      </Card>
    </Link>
  );
}

const Grid = ({ loading, items, render, empty }) =>
  loading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
    : items.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(render)}</div> : empty;

export default function Courses() {
  const { user, profile } = useAuth();
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");
  const [q, setQ] = useState("");
  const term = cleanSearch(q);
  const filtered = Boolean(term) || category !== "all" || level !== "all";
  const teacher = canTeach(profile);
  const signupHref = useAuthHref("/signup");

  const catalog = useQuery({
    queryKey: ["courses", "catalog", category, level, term],
    queryFn: async () => {
      let s = supabase.from("courses").select(COURSE_CARD).eq("is_published", true).order("created_at", { ascending: false }).limit(60);
      if (category !== "all") s = s.eq("category", category);
      if (level !== "all") s = s.eq("level", level);
      if (term) s = s.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
      return unwrap(await s);
    },
  });
  const learning = useQuery({
    queryKey: ["courses", "learning", user?.id],
    enabled: Boolean(user),
    queryFn: async () => unwrap(await supabase.from("enrollments").select(`created_at, course:courses(${COURSE_CARD})`)
      .eq("user_id", user.id).order("created_at", { ascending: false })).filter((e) => e.course),
  });
  const teaching = useQuery({
    queryKey: ["courses", "teaching", user?.id],
    enabled: Boolean(user),
    queryFn: async () => unwrap(await supabase.from("courses").select(COURSE_CARD).eq("instructor_id", user.id).order("created_at", { ascending: false })),
  });

  // Instructors whose plan ended still see (and can edit) the courses they already made.
  const showTeaching = teacher || (teaching.data?.length ?? 0) > 0;

  return (
    <div>
    <PageHeader tone="blue" title="קורסים" text="ללמוד ממוזיקאים אחרים, בקצב שלכם."
      actions={teacher && <Button asChild size="lg" variant="secondary"><Link to="/courses/new"><Plus />קורס חדש</Link></Button>} />
    <div className="page">
      <Tabs defaultValue="catalog" dir="rtl">
        <TabsList>
          <TabsTrigger value="catalog">כל הקורסים</TabsTrigger>
          {user && <TabsTrigger value="learning">הלמידה שלי</TabsTrigger>}
          {showTeaching && <TabsTrigger value="teaching">הקורסים שלי</TabsTrigger>}
        </TabsList>
        <TabsContent value="catalog" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש קורס…" className="ps-9" aria-label="חיפוש קורס" />
            </div>
            <Select value={category} onValueChange={setCategory} dir="rtl">
              <SelectTrigger className="w-40" aria-label="תחום"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">כל התחומים</SelectItem>{COURSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={level} onValueChange={setLevel} dir="rtl">
              <SelectTrigger className="w-36" aria-label="רמה"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">כל הרמות</SelectItem>{COURSE_LEVELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Grid loading={catalog.isLoading} items={catalog.data ?? []} render={(c) => <CourseCard key={c.id} c={c} />}
            empty={filtered
              ? <EmptyState icon={GraduationCap} title="לא מצאנו קורס כזה" text="נסו מילה אחרת, תחום אחר או רמה אחרת."
                  action={<Button variant="outline" onClick={() => { setQ(""); setCategory("all"); setLevel("all"); }}>ניקוי החיפוש</Button>} />
              : <EmptyState icon={GraduationCap} title="הכיתה עוד ריקה"
                  text="כאן יופיעו קורסים של מוזיקאים: נגינה, הפקה, כתיבה ועוד, בקצב שלכם."
                  action={teacher
                    ? <Button asChild><Link to="/courses/new"><Plus />פתיחת הקורס הראשון</Link></Button>
                    : !user && <Button asChild><Link to={signupHref}>פתיחת פרופיל חינם</Link></Button>} />} />
          {!teacher && (
            <Card className="flex flex-wrap items-center gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF2C2] text-[#6E5200]"><GraduationCap className="h-5 w-5" aria-hidden /></span>
              <p className="min-w-[12rem] flex-1 text-sm"><span className="font-bold">מלמדים מוזיקה?</span> פתחו קורס משלכם והגיעו לתלמידים חדשים.</p>
              <Button asChild variant="outline"><Link to="/pricing">איך מתחילים ללמד</Link></Button>
            </Card>
          )}
        </TabsContent>
        {user && (
          <TabsContent value="learning">
            <Grid loading={learning.isLoading} items={learning.data ?? []} render={(e) => <CourseCard key={e.course.id} c={e.course} />}
              empty={<EmptyState icon={GraduationCap} title="עוד לא נרשמתם לקורס" text="בחרו קורס מהקטלוג והתחילו ללמוד." />} />
          </TabsContent>
        )}
        {showTeaching && (
          <TabsContent value="teaching">
            <Grid loading={teaching.isLoading} items={teaching.data ?? []} render={(c) => <CourseCard key={c.id} c={c} />}
              empty={<EmptyState icon={GraduationCap} title="עוד לא יצרתם קורס" action={<Button asChild><Link to="/courses/new">יצירת קורס</Link></Button>} />} />
          </TabsContent>
        )}
      </Tabs>
    </div>
    </div>
  );
}
