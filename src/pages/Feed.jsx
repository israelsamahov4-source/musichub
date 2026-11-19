import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, GraduationCap, Handshake, Music, Pencil, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import UserAvatar from "@/components/UserAvatar";
import { supabase } from "@/lib/supabase";
import { label } from "@/lib/config";
import { safeUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostComposer from "@/components/PostComposer";
import PostList from "@/components/PostList";
import EmptyState from "@/components/EmptyState";
import SuggestedMusicians from "@/components/SuggestedMusicians";
import { fetchFollowingIds } from "@/api/posts";
import { useAuth } from "@/auth/AuthProvider";
import { usePageTitle } from "@/lib/usePageTitle";

export default function Feed() {
  const { user, profile } = useAuth();
  usePageTitle("פיד");
  const firstName = (profile?.full_name || "").split(" ")[0];
  const following = useQuery({ queryKey: ["following-ids", user.id], queryFn: () => fetchFollowingIds(user.id) });
  const authorIds = following.data ? [user.id, ...following.data] : null;
  // New members follow nobody yet: open on the whole community instead of an empty tab.
  const [picked, setPicked] = useState(null);
  const tab = picked ?? (following.data && following.data.length === 0 ? "all" : "following");
  const isNew = following.data?.length === 0;

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-3 md:py-8 lg:grid-cols-[232px_minmax(0,1fr)_300px]">
      <aside className="sticky top-24 hidden space-y-4 lg:block" aria-label="הפרופיל שלי">
        <ProfileSummary />
      </aside>
      <div className="min-w-0 space-y-4">
        <h1 className="sr-only">{firstName ? `מה מנגנים היום, ${firstName}?` : "מה מנגנים היום?"}</h1>
        <PostComposer />
        {isNew && <div className="lg:hidden"><SuggestedMusicians /></div>}
        <Tabs value={tab} onValueChange={setPicked} dir="rtl">
          <TabsList className="-mx-4 mb-4 flex px-4 md:mx-0 md:px-0">
            <TabsTrigger value="following">עוקב/ת</TabsTrigger>
            <TabsTrigger value="all">כל הקהילה</TabsTrigger>
            <TabsTrigger value="collab">מחפשים שותפים</TabsTrigger>
          </TabsList>
          <TabsContent value="following">
            <PostList
              queryKey={["following", user.id, authorIds?.length]}
              filters={{ authorIds }}
              enabled={Boolean(authorIds)}
              empty={<EmptyState icon={Users} title="עוד לא עוקבים אחרי אף אחד" text="עקבו אחרי כמה מוזיקאים, ומה שהם ישתפו יופיע כאן."
                action={<Button asChild><Link to="/discover">גילוי מוזיקאים</Link></Button>} />}
            />
          </TabsContent>
          <TabsContent value="all">
            <PostList queryKey={["all"]} empty={<EmptyState icon={Music} title="עדיין אין פוסטים" text="שתפו קטע, דמו או שאלה, ותהיו הראשונים בקהילה." />} />
          </TabsContent>
          <TabsContent value="collab">
            <PostList queryKey={["collab"]} filters={{ collabOnly: true }}
              empty={<EmptyState icon={Handshake} title="אין כרגע בקשות לשותפים" text="סמנו 'מחפש/ת שותפים' בפוסט כדי שיופיע כאן." />} />
          </TabsContent>
        </Tabs>
      </div>
      <aside className="sticky top-24 hidden space-y-4 lg:block">
        <SuggestedMusicians />
        <Card className="overflow-hidden">
          <div className="p-4">
            <h2 className="text-[15px] font-bold">מחפשים במה?</h2>
            <p className="mt-1 text-sm text-muted-foreground">פרויקטים שמחפשים נגנים, וקורסים ממוזיקאים שעושים את זה כל יום.</p>
          </div>
          <Link to="/collabs" className="flex items-center gap-3 border-t border-border/70 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFE3EB] text-[#B01E4C]"><Handshake className="h-[18px] w-[18px]" aria-hidden /></span>
            פרויקטים פתוחים<ChevronLeft className="ms-auto h-4 w-4 text-muted-foreground" aria-hidden />
          </Link>
          <Link to="/courses" className="flex items-center gap-3 border-t border-border/70 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5E9FB] text-primary"><GraduationCap className="h-[18px] w-[18px]" aria-hidden /></span>
            קורסים<ChevronLeft className="ms-auto h-4 w-4 text-muted-foreground" aria-hidden />
          </Link>
        </Card>
      </aside>
    </div>
  );
}

/** My card at the start of the feed: who I am, my numbers, and shortcuts. */
function ProfileSummary() {
  const { user, profile } = useAuth();
  const { data: stats } = useQuery({
    queryKey: ["profile-stats", user.id],
    queryFn: async () => {
      const count = async (q) => (await q).count ?? 0;
      const [followers, following, posts] = await Promise.all([
        count(supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id)),
        count(supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id)),
        count(supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", user.id)),
      ]);
      return { followers, following, posts };
    },
  });
  if (!profile) return null;
  const role = profile.instruments?.[0] ? label("instruments", profile.instruments[0]) : profile.user_type === "listener" ? "חובב/ת מוזיקה" : "מוזיקאי/ת";
  const cover = safeUrl(profile.cover_url);
  return (
    <Card className="overflow-hidden">
      <div className="h-16 bg-riso-blue bg-cover bg-center" style={cover ? { backgroundImage: `url(${cover})` } : undefined} />
      <div className="px-4 pb-4">
        <Link to={`/u/${profile.username}`} className="-mt-8 block w-fit rounded-full ring-4 ring-card" aria-hidden="true" tabIndex={-1}>
          <UserAvatar profile={profile} size="lg" />
        </Link>
        <Link to={`/u/${profile.username}`} className="mt-2 block truncate text-[15px] font-bold hover:underline">{profile.full_name || profile.username}</Link>
        <p className="truncate text-sm text-muted-foreground">{role}{profile.location && ` · ${profile.location}`}</p>
      </div>
      <dl className="grid grid-cols-3 border-t border-border/70 text-center">
        {[["עוקבים", stats?.followers], ["נעקבים", stats?.following], ["פוסטים", stats?.posts]].map(([t, v]) => (
          <div key={t} className="py-3"><dd className="tabular text-[15px] font-bold">{v ?? "–"}</dd><dt className="text-xs text-muted-foreground">{t}</dt></div>
        ))}
      </dl>
      <nav className="border-t border-border/70 p-1.5 text-sm" aria-label="קיצורים">
        <Link to="/profile/edit" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted"><Pencil className="h-4 w-4 text-muted-foreground" aria-hidden />עריכת הפרופיל</Link>
        <Link to="/collabs" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted"><Handshake className="h-4 w-4 text-muted-foreground" aria-hidden />הפרויקטים שלי</Link>
        <Link to="/courses" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted"><GraduationCap className="h-4 w-4 text-muted-foreground" aria-hidden />הלמידה שלי</Link>
      </nav>
    </Card>
  );
}
