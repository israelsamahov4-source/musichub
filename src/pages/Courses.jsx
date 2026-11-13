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
import UserAvatar from "@/components/UserAvatar";
import EmptyState from "@/components/EmptyState";
import { supabase, unwrap } from "@/lib/supabase";
import { COURSE_CARD, canTeach } from "@/api/courses";
import { useAuth } from "@/auth/AuthProvider";
import { COURSE_CATEGORIES, COURSE_LEVELS, label } from "@/lib/config";
import { cleanSearch, safeUrl } from "@/lib/utils";

export function CourseCard({ c, extra }) {
  return (
    <Link to={`/courses/${c.id}`} className="block">
      <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-[16/9] bg-gradient-to-br from-primary/80 to-secondary">
          {safeUrl(c.cover_url) ? <img src={safeUrl(c.cover_url)} alt="" loading="lazy" className="h-full w-full object-cover" />
            : <GraduationCap className="absolute inset-0 m-auto h-12 w-12 text-primary-foreground/80" aria-hidden />}
          {!c.is_free && <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[11px] font-bold text-primary"><Star className="h-3 w-3" aria-hidden />Pro</span>}
          {!c.is_published && <span className="absolute end-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">טיוטה</span>}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <p className="text-xs text-muted-foreground">{label("courseCategories", c.category)} · {label("courseLevels", c.level)}</p>
          <h3 className="mt-1 font-semibold leading-snug">{c.title}</h3>
          <div className="mt-auto flex items-center gap-2 pt-3 text-sm text-muted-foreground">
            <UserAvatar profile={c.instructor} size="xs" />
            <span className="truncate">{c.instructor?.full_name || c.instructor?.username}</span>
          </div>
          {extra}
        </div>
      </Card>
    </Link>
  );
}

const Grid = ({ loading, items, render, empty }) =>
  loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
    : items.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(render)}</div> : empty;

export default function Courses() {
  const { user, profile } = useAuth();
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");
  const [q, setQ] = useState("");
  const term = cleanSearch(q);
  const teacher = canTeach(profile);

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
    enabled: Boolean(user && teacher),
    queryFn: async () => unwrap(await supabase.from("courses").select(COURSE_CARD).eq("instructor_id", user.id).order("created_at", { ascending: false })),
  });

  return (
    <div className="page">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1">
          <h1 className="page-title">קורסים</h1>
          <p className="mt-1 text-muted-foreground">ללמוד ממוזיקאים אחרים, בקצב שלכם.</p>
        </div>
        {teacher && <Button asChild><Link to="/courses/new"><Plus />קורס חדש</Link></Button>}
      </div>

      <Tabs defaultValue="catalog" dir="rtl" className="mt-6">
        <TabsList>
          <TabsTrigger value="catalog">כל הקורסים</TabsTrigger>
          {user && <TabsTrigger value="learning">הלמידה שלי</TabsTrigger>}
          {teacher && <TabsTrigger value="teaching">הקורסים שלי</TabsTrigger>}
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
            empty={<EmptyState icon={GraduationCap} title="עדיין אין כאן קורסים" text="קורסים חדשים יעלו בקרוב." />} />
          {!teacher && (
            <Card className="flex flex-wrap items-center gap-3 bg-secondary p-4">
              <p className="flex-1 text-sm">מלמדים מוזיקה? פתחו קורס משלכם והגיעו לתלמידים חדשים.</p>
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
        {teacher && (
          <TabsContent value="teaching">
            <Grid loading={teaching.isLoading} items={teaching.data ?? []} render={(c) => <CourseCard key={c.id} c={c} />}
              empty={<EmptyState icon={GraduationCap} title="עוד לא יצרתם קורס" action={<Button asChild><Link to="/courses/new">יצירת קורס</Link></Button>} />} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
