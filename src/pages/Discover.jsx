import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { GraduationCap, Handshake, MapPin, Search, SlidersHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import UserAvatar, { brandFor } from "@/components/UserAvatar";
import PlanBadge from "@/components/PlanBadge";
import FollowButton from "@/components/FollowButton";
import TagPicker from "@/components/TagPicker";
import CityPicker from "@/components/CityPicker";
import { REGION_NAMES, canonicalCity, citiesIn } from "@/lib/cities";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import Field from "@/components/Field";
import { supabase, unwrap } from "@/lib/supabase";
import { GENRES, INSTITUTIONS, INSTRUMENTS, LOOKING_FOR, ROLES, STUDY_TRACKS, STUDY_YEARS, label, studyLine } from "@/lib/config";
import { useAuth } from "@/auth/AuthProvider";
import { cleanSearch, cn } from "@/lib/utils";
import LoadError from "@/components/LoadError";
import { tr } from "@/lib/i18n";

const PAGE = 24;
const EMPTY = { q: "", location: "", instruments: [], genres: [], lookingFor: [], roles: [], openOnly: false, institutions: [], tracks: [], years: [], studentsOnly: false };
// Chips show the short institution names ("רימון", "בוכמן-מהטה").
const INSTITUTION_CHIPS = INSTITUTIONS.map((o) => ({ value: o.value, label: o.short }));

function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

function MusicianCard({ p }) {
  const roles = (Array.isArray(p.musical_roles) ? p.musical_roles : []).filter((r) => typeof r?.role === "string").map((r) => label("roles", r.role));
  const subtitle = p.details?.headline || [...roles.slice(0, 1), ...p.instruments.slice(0, 2).map((i) => label("instruments", i))].join(" · ") || (p.user_type === "listener" ? tr("חובב/ת מוזיקה") : tr("מוזיקאי/ת"));
  return (
    <Card className="group relative flex min-w-0 flex-col overflow-hidden text-center transition-shadow duration-200 can-hover:hover:shadow-pop">
      <div className="h-14" style={{ backgroundColor: p.plan_tier && p.plan_tier !== "free" ? "#FFD84D" : brandFor(p.id) }} aria-hidden />
      <div className="flex flex-1 flex-col items-center px-3 pb-4">
        <Link to={`/u/${p.username}`} aria-hidden="true" tabIndex={-1} className="-mt-9 rounded-full ring-4 ring-card"><UserAvatar profile={p} size="lg" className="h-[72px] w-[72px]" /></Link>
        <Link to={`/u/${p.username}`} className="mt-2 flex max-w-full items-center justify-center gap-1.5 font-bold after:absolute after:inset-0 hover:underline">
          <span className="truncate">{p.full_name || p.username}</span>
        </Link>
        <p className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 text-muted-foreground">{subtitle}</p>
        {studyLine(p) && <p className="mt-1 flex max-w-full items-center gap-1 text-xs font-medium text-foreground/75"><GraduationCap className="h-3.5 w-3.5 shrink-0 text-primary" aria-label={tr("לימודים")} /><span className="truncate">{studyLine(p)}</span></p>}
        {p.location && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" aria-hidden />{p.location}</p>}
        {p.looking_for?.length > 0 && (
          <p className="mt-2 flex max-w-full items-center gap-1 rounded-full bg-[#FFF0F4] px-2.5 py-0.5 text-xs font-semibold text-[#8E1840]" title={p.looking_for.map((v) => label("lookingFor", v)).join(", ")}>
            <Handshake className="h-3.5 w-3.5 shrink-0" aria-label={tr("מחפש/ת")} />
            <span className="truncate">{label("lookingFor", p.looking_for[0])}</span>{p.looking_for.length > 1 && <span className="shrink-0">+{p.looking_for.length - 1}</span>}
          </p>
        )}
        <div className="relative z-10 mt-auto w-full pt-4 [&_button]:w-full"><FollowButton profileId={p.id} quiet /></div>
      </div>
      {p.plan_tier && p.plan_tier !== "free" && <PlanBadge tier={p.plan_tier} className="absolute end-2 top-2" />}
    </Card>
  );
}

const QUICK = ["vocals", "guitar", "bass", "drums", "piano", "synth", "violin", "saxophone"];

export default function Discover() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const urlQ = params.get("q") || "";
  const [f, setF] = useState(() => ({ ...EMPTY, q: urlQ }));
  // A new search from the top bar while already on this page.
  useEffect(() => { setF((s) => (s.q === urlQ ? s : { ...s, q: urlQ })); }, [urlQ]);
  const [showFilters, setShowFilters] = useState(false);
  const q = useDebounced(cleanSearch(f.q));
  const location = useDebounced(cleanSearch(f.location));
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const activeCount = f.instruments.length + f.genres.length + f.lookingFor.length + f.roles.length + (f.location ? 1 : 0) + (f.openOnly ? 1 : 0)
    + f.institutions.length + f.tracks.length + f.years.length + (f.studentsOnly ? 1 : 0);

  const query = useInfiniteQuery({
    queryKey: ["discover", q, location, f.instruments, f.genres, f.lookingFor, f.roles, f.openOnly, f.institutions, f.tracks, f.years, f.studentsOnly],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let s = supabase.from("profiles")
        .select("id, username, full_name, avatar_url, bio, location, user_type, instruments, genres, musical_roles, looking_for, institution, study_track, study_year, plan_tier, details:profile_details(headline)")
        .eq("onboarding_completed", true).neq("id", user.id)
        .order("created_at", { ascending: false }).range(pageParam * PAGE, pageParam * PAGE + PAGE - 1);
      if (q) s = s.or(`full_name.ilike.%${q}%,username.ilike.%${q}%,bio.ilike.%${q}%`);
      if (location) {
        // A region finds everyone in its cities; a listed city matches its one spelling; other text is searched as is.
        const city = canonicalCity(location);
        if (REGION_NAMES.includes(location)) s = s.in("location", citiesIn(location));
        else if (city) s = s.eq("location", city);
        else s = s.ilike("location", `%${location}%`);
      }
      if (f.instruments.length) s = s.overlaps("instruments", f.instruments);
      if (f.genres.length) s = s.overlaps("genres", f.genres);
      if (f.lookingFor.length) s = s.overlaps("looking_for", f.lookingFor);
      if (f.roles.length) s = s.overlaps("role_list", f.roles);
      if (f.openOnly) s = s.neq("looking_for", "{}"); // picked at least one thing they are looking for
      if (f.institutions.length) s = s.in("institution", f.institutions);
      if (f.tracks.length) s = s.in("study_track", f.tracks);
      if (f.years.length) s = s.in("study_year", f.years);
      if (f.studentsOnly) s = s.not("institution", "is", null); // students and alumni
      return unwrap(await s);
    },
    getNextPageParam: (last, pages) => (last.length === PAGE ? pages.length : undefined),
  });
  const people = query.data?.pages.flat() ?? [];

  return (
    <div>
    <PageHeader title={tr("מוזיקאים")} text={tr("מצאו נגנים, זמרים, מפיקים ומורים לפי כלי, מוסד לימודים, תפקיד, ז'אנר ומיקום.")} />
    <div className="page">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={f.q} onChange={(e) => set("q")(e.target.value)} placeholder={tr("חיפוש לפי שם או תיאור…")} className="h-12 rounded-full ps-11 shadow-card" aria-label={tr("חיפוש מוזיקאים")} />
        </div>
        <Button variant={showFilters || activeCount ? "secondary" : "outline"} className="h-12 shadow-card" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
          <SlidersHorizontal />{tr("סינון")}{activeCount > 0 && ` (${activeCount})`}
        </Button>
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4" role="group" aria-label={tr("סינון מהיר")}>
        <button type="button" aria-pressed={f.studentsOnly} onClick={() => set("studentsOnly")(!f.studentsOnly)}
          className={cn("flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors", f.studentsOnly ? "bg-primary text-white" : "bg-card text-foreground/80 shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:bg-muted")}>
          <GraduationCap className="h-4 w-4" aria-hidden />{tr("סטודנטים ובוגרים")}
        </button>
        {QUICK.filter((v) => INSTRUMENTS.some((o) => o.value === v)).map((v) => {
          const on = f.instruments.includes(v);
          return (
            <button key={v} type="button" aria-pressed={on}
              onClick={() => set("instruments")(on ? f.instruments.filter((x) => x !== v) : [...f.instruments, v])}
              className={cn("min-h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors", on ? "bg-primary text-white" : "bg-card text-foreground/80 shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:bg-muted")}>
              {label("instruments", v)}
            </button>
          );
        })}
      </div>

      {showFilters && (
        <Card className="mt-3 space-y-4 p-4">
          <Field label={tr("מוסד לימודים")}><TagPicker options={INSTITUTION_CHIPS} value={f.institutions} onChange={set("institutions")} label={tr("מוסד לימודים")} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={tr("מסלול")}><TagPicker options={STUDY_TRACKS} value={f.tracks} onChange={set("tracks")} label={tr("מסלול")} /></Field>
            <Field label={tr("שנת לימודים")}><TagPicker options={STUDY_YEARS} value={f.years} onChange={set("years")} label={tr("שנת לימודים")} /></Field>
          </div>
          <Field label={tr("כלי נגינה")}><TagPicker options={INSTRUMENTS} value={f.instruments} onChange={set("instruments")} label={tr("כלי נגינה")} /></Field>
          <Field label={tr("תפקיד")}><TagPicker options={ROLES} value={f.roles} onChange={set("roles")} label={tr("תפקיד")} /></Field>
          <Field label={tr("ז'אנר")}><TagPicker options={GENRES} value={f.genres} onChange={set("genres")} label={tr("ז'אנר")} /></Field>
          <Field label={tr("מחפשים")}><TagPicker options={LOOKING_FOR} value={f.lookingFor} onChange={set("lookingFor")} label={tr("מחפשים")} /></Field>
          <div className="flex flex-wrap items-end gap-4">
            <Field id="loc" label={tr("עיר או אזור")}><CityPicker id="loc" regions value={f.location} onChange={set("location")} placeholder={tr("עיר או אזור")} className="w-60" /></Field>
            <label className="flex items-center gap-2 pb-2 text-sm"><Switch aria-label={tr("רק פתוחים לשיתופי פעולה")} checked={f.openOnly} onCheckedChange={set("openOnly")} />{tr("רק פתוחים לשיתופי פעולה")}</label>
            {activeCount > 0 && <Button variant="ghost" onClick={() => setF({ ...EMPTY, q: f.q })}>{tr("ניקוי סינון")}</Button>}
          </div>
        </Card>
      )}

      <div className="mt-5">
        {query.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
        ) : query.isError ? (
          <LoadError onRetry={query.refetch} />
        ) : people.length === 0 ? (
          <EmptyState icon={Users} title={tr("לא מצאנו מוזיקאים שמתאימים לחיפוש")} text={tr("נסו להרחיב את הסינון.")} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{people.map((p) => <MusicianCard key={p.id} p={p} />)}</div>
            {query.hasNextPage && (
              <div className="mt-6 flex justify-center">
                <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>{tr("עוד תוצאות")}</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </div>
  );
}
