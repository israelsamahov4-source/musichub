import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, GraduationCap, Handshake, Home, LogOut, MessageCircle, Search, Settings, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UserAvatar from "@/components/UserAvatar";
import PlanBadge from "@/components/PlanBadge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/feed", label: "פיד", icon: Home, auth: true },
  { to: "/discover", label: "מוזיקאים", icon: Search, auth: true },
  { to: "/collabs", label: "פרויקטים", icon: Handshake },
  { to: "/courses", label: "קורסים", icon: GraduationCap },
  { to: "/messages", label: "הודעות", icon: MessageCircle, auth: true, badge: "messages" },
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
    <span className={cn("min-w-[18px] rounded-full bg-riso-pink px-1 text-center text-[10px] font-bold leading-[18px] text-ink", className)}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function Logo() {
  return (
    <Link to="/" className="group flex shrink-0 items-baseline gap-2" aria-label={`${APP_NAME} — דף הבית`}>
      <span className="riso font-display text-[2.5rem] font-bold leading-none tracking-tight">{APP_NAME}</span>
      <span className="hidden text-xs text-muted-foreground lg:inline">{APP_TAGLINE}</span>
    </Link>
  );
}

export default function AppLayout() {
  const { user, profile, signOut } = useAuth();
  const counts = useUnreadCounts(user?.id);
  const location = useLocation();
  const items = NAV.filter((n) => user || !n.auth);

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">דילוג לתוכן</a>
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Logo />
          <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="ניווט ראשי">
            {items.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => cn(
                "relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-ink text-white" : "text-ink/70 hover:bg-muted hover:text-ink")}>
                <n.icon className="h-4 w-4" aria-hidden />{n.label}
                {n.badge === "messages" && <CountBadge count={counts.messages} />}
              </NavLink>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2 md:ms-0">
            {user ? (
              <>
                <Button asChild variant="ghost" size="icon" className="relative" aria-label={`התראות${counts.notifications ? ` (${counts.notifications} חדשות)` : ""}`}>
                  <Link to="/notifications"><Bell className="!size-5" /><CountBadge count={counts.notifications} className="absolute -end-0.5 -top-0.5" /></Link>
                </Button>
                <DropdownMenu dir="rtl">
                  <DropdownMenuTrigger className="rounded-full" aria-label="תפריט משתמש"><UserAvatar profile={profile} /></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="font-semibold">{profile?.full_name || profile?.username}</div>
                      <div className="ltr text-xs text-muted-foreground">@{profile?.username}</div>
                      <PlanBadge tier={profile?.plan_tier} className="mt-1" />
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link to={`/u/${profile?.username}`}><User className="h-4 w-4" />הפרופיל שלי</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/settings"><Settings className="h-4 w-4" />הגדרות</Link></DropdownMenuItem>
                    {profile?.plan_tier === "free" && (
                      <DropdownMenuItem asChild><Link to="/pricing" className="text-primary"><Sparkles className="h-4 w-4" />שדרוג</Link></DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4" />התנתקות</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button asChild variant="ghost"><Link to="/login">התחברות</Link></Button>
                <Button asChild className="rounded-full shadow-[3px_3px_0_#FF4F81]"><Link to="/signup">הרשמה</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main" className={cn("flex-1", user && "pb-20 md:pb-0")}>
        <Outlet />
      </main>

      <footer className={cn("border-t-2 border-ink bg-white", user && "mb-16 md:mb-0")}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-5 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <Link to="/terms" className="hover:text-foreground">תנאי שימוש</Link>
          <Link to="/privacy" className="hover:text-foreground">מדיניות פרטיות</Link>
          <Link to="/accessibility" className="hover:text-foreground">הצהרת נגישות</Link>
          <Link to="/pricing" className="hover:text-foreground">מחירים</Link>
        </div>
      </footer>

      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-white md:hidden" aria-label="ניווט תחתון">
          <div className="grid grid-cols-5">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => cn(
                "relative flex flex-col items-center gap-0.5 py-2 text-[11px]", isActive ? "text-primary" : "text-muted-foreground")}>
                <n.icon className="h-5 w-5" aria-hidden />{n.label}
                {n.badge === "messages" && <CountBadge count={counts.messages} className="absolute end-[calc(50%-20px)] top-1" />}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
