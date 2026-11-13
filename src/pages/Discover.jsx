import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { MapPin, Search, SlidersHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import UserAvatar from "@/components/UserAvatar";
import PlanBadge from "@/components/PlanBadge";
import FollowButton from "@/components/FollowButton";
import TagPicker from "@/components/TagPicker";
import EmptyState from "@/components/EmptyState";
import Field from "@/components/Field";
import { supabase, unwrap } from "@/lib/supabase";
import { GENRES, INSTRUMENTS, LOOKING_FOR, ROLES, label } from "@/lib/config";
import { useAuth } from "@/auth/AuthProvider";
import { cleanSearch } from "@/lib/utils";

const PAGE = 24;
const EMPTY = { q: "", location: "", instruments: [], genres: [], lookingFor: [], roles: [], openOnly: false };

function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

function MusicianCard({ p }) {
  const roles = (p.musical_roles || []).map((r) => label("roles", r.role));
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start gap-3">
        <Link to={`/u/${p.username}`}><UserAvatar profile={p} size="md" /></Link>
        <div className="min-w-0 flex-1">
          <Link to={`/u/${p.username}`} className="block truncate font-semibold hover:underline">{p.full_name || p.username}</Link>
          <p className="truncate text-sm text-muted-foreground">{p.details?.headline || roles.slice(0, 2).join(", ") || (p.user_type === "listener" ? "חובב/ת מוזיקה" : "מוזיקאי/ת")}</p>
          {p.location && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" aria-hidden />{p.location}</p>}
        </div>
        <PlanBadge tier={p.plan_tier} />
      </div>
      {p.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.instruments.slice(0, 3).map((i) => <span key={i} className="chip">{label("instruments", i)}</span>)}
        {p.genres.slice(0, 2).map((g) => <span key={g} className="chip">{label("genres", g)}</span>)}
      </div>
      <div className="mt-auto flex items-center justify-between pt-4">
        {p.details?.open_to?.length ? <span className="truncate text-xs font-medium text-emerald-700">פתוח/ה ל{label("openTo", p.details.open_to[0])}{p.details.open_to.length > 1 && ` ועוד ${p.details.open_to.length - 1}`}</span>
          : p.open_for_collaboration ? <span className="text-xs font-medium text-emerald-700">פתוח/ה לשיתופי פעולה</span> : <span />}
        <FollowButton profileId={p.id} />
      </div>
    </Card>
  );
}

export default function Discover() {
  const { user } = useAuth();
  const [f, setF] = useState(EMPTY);
  const [showFilters, setShowFilters] = useState(false);
  const q = useDebounced(cleanSearch(f.q));
  const location = useDebounced(cleanSearch(f.location));
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const activeCount = f.instruments.length + f.genres.length + f.lookingFor.length + f.roles.length + (f.location ? 1 : 0) + (f.openOnly ? 1 : 0);

  const query = useInfiniteQuery({
    queryKey: ["discover", q, location, f.instruments, f.genres, f.lookingFor, f.roles, f.openOnly],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let s = supabase.from("profiles")
        .select("id, username, full_name, avatar_url, bio, location, user_type, instruments, genres, musical_roles, open_for_collaboration, plan_tier, details:profile_details(headline, open_to)")
        .eq("onboarding_completed", true).neq("id", user.id)
        .order("created_at", { ascending: false }).range(pageParam * PAGE, pageParam * PAGE + PAGE - 1);
      if (q) s = s.or(`full_name.ilike.%${q}%,username.ilike.%${q}%,bio.ilike.%${q}%`);
      if (location) s = s.ilike("location", `%${location}%`);
      if (f.instruments.length) s = s.overlaps("instruments", f.instruments);
      if (f.genres.length) s = s.overlaps("genres", f.genres);
      if (f.lookingFor.length) s = s.overlaps("looking_for", f.lookingFor);
      if (f.roles.length) s = s.overlaps("role_list", f.roles);
      if (f.openOnly) s = s.eq("open_for_collaboration", true);
      return unwrap(await s);
    },
    getNextPageParam: (last, pages) => (last.length === PAGE ? pages.length : undefined),
  });
  const people = query.data?.pages.flat() ?? [];

  return (
    <div className="page">
      <h1 className="page-title">גילוי מוזיקאים</h1>
      <p className="mt-1 text-muted-foreground">מצאו נגנים, זמרים, מפיקים ומורים לפי כלי, ז'אנר ומיקום.</p>

      <div className="mt-5 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={f.q} onChange={(e) => set("q")(e.target.value)} placeholder="חיפוש לפי שם או תיאור…" className="ps-9" aria-label="חיפוש מוזיקאים" />
        </div>
        <Button variant={showFilters ? "secondary" : "outline"} onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
          <SlidersHorizontal />סינון{activeCount > 0 && ` (${activeCount})`}
        </Button>
      </div>

      {showFilters && (
        <Card className="mt-3 space-y-4 p-4">
          <Field label="כלי נגינה"><TagPicker options={INSTRUMENTS} value={f.instruments} onChange={set("instruments")} label="כלי נגינה" /></Field>
          <Field label="תפקיד"><TagPicker options={ROLES} value={f.roles} onChange={set("roles")} label="תפקיד" /></Field>
          <Field label="ז'אנר"><TagPicker options={GENRES} value={f.genres} onChange={set("genres")} label="ז'אנר" /></Field>
          <Field label="מחפשים"><TagPicker options={LOOKING_FOR} value={f.lookingFor} onChange={set("lookingFor")} label="מחפשים" /></Field>
          <div className="flex flex-wrap items-end gap-4">
            <Field id="loc" label="מיקום"><Input id="loc" value={f.location} onChange={(e) => set("location")(e.target.value)} placeholder="עיר" className="w-48" /></Field>
            <label className="flex items-center gap-2 pb-2 text-sm"><Switch checked={f.openOnly} onCheckedChange={set("openOnly")} />רק פתוחים לשיתופי פעולה</label>
            {activeCount > 0 && <Button variant="ghost" onClick={() => setF({ ...EMPTY, q: f.q })}>ניקוי סינון</Button>}
          </div>
        </Card>
      )}

      <div className="mt-6">
        {query.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        ) : people.length === 0 ? (
          <EmptyState icon={Users} title="לא מצאנו מוזיקאים שמתאימים לחיפוש" text="נסו להרחיב את הסינון." />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{people.map((p) => <MusicianCard key={p.id} p={p} />)}</div>
            {query.hasNextPage && (
              <div className="mt-6 flex justify-center">
                <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>עוד תוצאות</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
