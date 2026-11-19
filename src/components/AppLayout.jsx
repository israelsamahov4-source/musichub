import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronDown, Globe, GraduationCap, Handshake, Home, LogOut, MessageCircle, Search, Settings, Shield, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UserAvatar from "@/components/UserAvatar";
import PlanBadge from "@/components/PlanBadge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useAuthHref } from "@/auth/returnTo";
import ErrorBoundary from "@/components/ErrorBoundary";
import Wordmark from "@/components/Wordmark";
import LanguageSwitch from "@/components/LanguageSwitch";
import { DIR, LANG, setLang, tr } from "@/lib/i18n";

const NAV = [
  { to: "/feed", label: tr("בית"), icon: Home, auth: true },
  { to: "/discover", label: tr("מוזיקאים"), icon: Search, auth: true },
  { to: "/collabs", label: tr("פרויקטים"), icon: Handshake },
  { to: "/courses", label: tr("קורסים"), icon: GraduationCap },
  { to: "/messages", label: tr("הודעות"), icon: MessageCircle, auth: true, badge: "messages" },
];

function useUnreadCounts(userId) {
  const qc = useQueryClient();
  const notifications = useQuery({
    queryKey: ["unread", "notifications", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
      return count ?? 0;
    },
    refetchInterval: 120_000,
  });
  const messages = useQuery({
    queryKey: ["unread", "messages", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase.rpc("my_conversations");
      return (data ?? []).reduce((sum, c) => sum + Number(c.unread_count || 0), 0);
    },
    refetchInterval: 120_000,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`inbox-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        qc.invalidateQueries({ queryKey: ["unread", "notifications"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["unread", "messages"] });
        qc.invalidateQueries({ queryKey: ["conversations"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, qc]);

  return { notifications: notifications.data ?? 0, messages: messages.data ?? 0 };
}

function CountBadge({ count, className }) {
  if (!count) return null;
  return (
    <span className={cn("min-w-[18px] rounded-full bg-riso-pinkdeep px-1 text-center text-[11px] font-bold leading-[18px] text-white ring-2 ring-card", className)}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2" aria-label={tr("{0} — דף הבית", APP_NAME)}>
      <Wordmark />
    </Link>
  );
}

/** Header search: sends the words to the musicians page. */
function HeaderSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <form role="search" className="relative hidden w-full max-w-[280px] md:block" onSubmit={(e) => { e.preventDefault(); navigate(`/discover${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`); }}>
      <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("חיפוש מוזיקאים")} aria-label={tr("חיפוש מוזיקאים")}
        className="h-10 w-full rounded-full border border-transparent bg-muted ps-10 pe-4 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:bg-[hsl(228_26%_92%)] focus:border-primary/40 focus:bg-card" />
    </form>
  );
}

export default function AppLayout() {
  const loginHref = useAuthHref("/login");
  const signupHref = useAuthHref("/signup");
  const { user, profile, signOut } = useAuth();
  const counts = useUnreadCounts(user?.id);
  const location = useLocation();
  const items = NAV.filter((n) => user || !n.auth);

  // On every page change: back to the top, and move keyboard / screen-reader focus to the new content.
  const firstRender = useRef(true);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (firstRender.current) { firstRender.current = false; return; }
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">{tr("דילוג לתוכן")}</a>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:h-16 md:gap-5">
          <Logo />
          <HeaderSearch />
          <nav className="ms-auto hidden h-full items-stretch md:flex" aria-label={tr("ניווט ראשי")}>
            {items.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => cn(
                "relative flex min-w-[76px] flex-col items-center justify-center gap-1 px-2 text-xs font-medium transition-colors",
                "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity",
                isActive ? "text-primary after:opacity-100" : "text-muted-foreground hover:text-foreground")}>
                {({ isActive }) => (
                  <>
                    <span className="relative"><n.icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 1.8} aria-hidden />
                      {n.badge === "messages" && <CountBadge count={counts.messages} className="absolute -end-2.5 -top-1.5" />}</span>
                    {n.label}
                  </>
                )}
              </NavLink>
            ))}
            {user && (
              <NavLink to="/notifications" className={({ isActive }) => cn(
                "relative flex min-w-[76px] flex-col items-center justify-center gap-1 px-2 text-xs font-medium transition-colors",
                "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0",
                isActive ? "text-primary after:opacity-100" : "text-muted-foreground hover:text-foreground")}>
                <span className="relative"><Bell className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden />
                  <CountBadge count={counts.notifications} className="absolute -end-2.5 -top-1.5" /></span>
                {tr("התראות")}
              </NavLink>
            )}
          </nav>
          <div className="ms-auto flex items-center gap-1 md:ms-2 md:gap-2">
            {user ? (
              <>
                <Button asChild variant="ghost" size="icon" className="relative md:hidden" aria-label={tr("חיפוש מוזיקאים")}>
                  <Link to="/discover"><Search className="!size-5" /></Link>
                </Button>
                <Button asChild variant="ghost" size="icon" className="relative md:hidden" aria-label={counts.notifications ? tr("התראות ({0} חדשות)", counts.notifications) : tr("התראות")}>
                  <Link to="/notifications"><Bell className="!size-5" /><CountBadge count={counts.notifications} className="absolute end-1 top-1" /></Link>
                </Button>
                <DropdownMenu dir={DIR}>
                  <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full p-0.5 md:flex-col md:gap-0.5 md:rounded-lg md:px-2" aria-label={tr("תפריט משתמש")}>
                    <UserAvatar profile={profile} size="xs" className="h-8 w-8 md:h-[26px] md:w-[26px]" />
                    <span className="hidden items-center gap-0.5 text-xs font-medium text-muted-foreground md:flex">{tr("אני")}<ChevronDown className="h-3 w-3" aria-hidden /></span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="flex items-center gap-3 p-2 font-normal">
                      <UserAvatar profile={profile} size="md" />
                      <div className="min-w-0">
                        <div className="truncate font-bold">{profile?.full_name || profile?.username}</div>
                        <div className="ltr truncate text-xs text-muted-foreground">@{profile?.username}</div>
                        <PlanBadge tier={profile?.plan_tier} className="mt-1" />
                      </div>
                    </DropdownMenuLabel>
                    <div className="px-2 pb-2"><Button asChild variant="outline" size="sm" className="w-full"><Link to={`/u/${profile?.username}`}>{tr("לפרופיל שלי")}</Link></Button></div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link to="/profile/edit"><User className="h-4 w-4" />{tr("עריכת פרופיל")}</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/settings"><Settings className="h-4 w-4" />{tr("הגדרות")}</Link></DropdownMenuItem>
                    {profile?.is_admin && <DropdownMenuItem asChild><Link to="/admin"><Shield className="h-4 w-4" />{tr("ניהול")}</Link></DropdownMenuItem>}
                    {profile?.plan_tier === "free" && (
                      <DropdownMenuItem asChild><Link to="/pricing" className="text-primary"><Sparkles className="h-4 w-4" />{tr("שדרוג ל-Pro")}</Link></DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setLang(LANG === "en" ? "he" : "en")} lang={LANG === "en" ? "he" : "en"}><Globe className="h-4 w-4" />{LANG === "en" ? "עברית" : "English"}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4" />{tr("התנתקות")}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <LanguageSwitch className="hidden sm:inline-flex" />
                <Button asChild variant="ghost"><Link to={loginHref}>{tr("התחברות")}</Link></Button>
                <Button asChild><Link to={signupHref}>{tr("הצטרפות")}</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>
      {/* Visitors on phones: page links scroll away with the page, so the pinned bar stays one row. */}
      {!user && (
        <nav className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border/80 bg-card px-4 py-2.5 md:hidden" aria-label={tr("ניווט")}>
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cn(
              "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium",
              isActive ? "bg-primary text-white" : "bg-muted text-foreground/80")}>
              <n.icon className="h-4 w-4" aria-hidden />{n.label}
            </NavLink>
          ))}
          <NavLink to="/pricing" className={({ isActive }) => cn("flex min-h-10 shrink-0 items-center rounded-full px-3.5 text-sm font-medium",
            isActive ? "bg-ink text-white" : "bg-muted text-ink/80")}>{tr("מחירים")}</NavLink>
        </nav>
      )}

      {profile?.is_suspended && (
        <div className="bg-destructive px-4 py-2 text-center text-sm text-destructive-foreground" role="alert">
          {tr("החשבון הושעה בעקבות דיווח. אפשר לצפות בתוכן אבל לא לפרסם. לבירור: פנו לצוות האתר.")}
        </div>
      )}
      <main id="main" tabIndex={-1} className={cn("flex-1 outline-none focus-visible:ring-0 focus-visible:ring-offset-0", user && "pb-20 md:pb-0")}>
        <ErrorBoundary key={location.pathname} inline><Outlet /></ErrorBoundary>
      </main>

      <footer className={cn("mt-10 border-t border-border/80 bg-card", user && "mb-16 md:mb-0")}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-5 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <Link to="/terms" className="hover:text-foreground">{tr("תנאי שימוש")}</Link>
          <Link to="/privacy" className="hover:text-foreground">{tr("מדיניות פרטיות")}</Link>
          <Link to="/accessibility" className="hover:text-foreground">{tr("הצהרת נגישות")}</Link>
          <Link to="/pricing" className="hover:text-foreground">{tr("מחירים")}</Link>
          <LanguageSwitch className="-my-2 ms-auto" />
        </div>
      </footer>

      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label={tr("ניווט תחתון")}>
          <div className="grid grid-cols-5">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                {({ isActive }) => (
                  <>
                    <n.icon className="h-6 w-6" strokeWidth={isActive ? 2.4 : 1.8} aria-hidden />{n.label}
                    {n.badge === "messages" && <CountBadge count={counts.messages} className="absolute end-[calc(50%-22px)] top-1" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
