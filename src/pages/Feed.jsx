import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Handshake, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostComposer from "@/components/PostComposer";
import PostList from "@/components/PostList";
import EmptyState from "@/components/EmptyState";
import SuggestedMusicians from "@/components/SuggestedMusicians";
import { fetchFollowingIds } from "@/api/posts";
import { useAuth } from "@/auth/AuthProvider";

export default function Feed() {
  const { user, profile } = useAuth();
  const firstName = (profile?.full_name || "").split(" ")[0];
  const following = useQuery({ queryKey: ["following-ids", user.id], queryFn: () => fetchFollowingIds(user.id) });
  const authorIds = following.data ? [user.id, ...following.data] : null;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
        <h1 className="riso font-display text-5xl font-bold leading-none md:text-6xl">
          {firstName ? `מה מנגנים היום, ${firstName}?` : "מה מנגנים היום?"}
        </h1>
        <PostComposer />
        <Tabs defaultValue="following" dir="rtl">
          <TabsList className="mb-4">
            <TabsTrigger value="following">אנשים שאני עוקב/ת</TabsTrigger>
            <TabsTrigger value="all">כל הקהילה</TabsTrigger>
            <TabsTrigger value="collab">מחפשים שותפים</TabsTrigger>
          </TabsList>
          <TabsContent value="following">
            <PostList
              queryKey={["following", user.id, authorIds?.length]}
              filters={{ authorIds }}
              enabled={Boolean(authorIds)}
              empty={<EmptyState icon={Users} title="הפיד שלכם עדיין שקט" text="עקבו אחרי מוזיקאים כדי לראות כאן את מה שהם משתפים."
                action={<Button asChild><Link to="/discover">גילוי מוזיקאים</Link></Button>} />}
            />
          </TabsContent>
          <TabsContent value="all">
            <PostList queryKey={["all"]} empty={<EmptyState title="עדיין אין פוסטים" text="היו הראשונים לשתף משהו!" />} />
          </TabsContent>
          <TabsContent value="collab">
            <PostList queryKey={["collab"]} filters={{ collabOnly: true }}
              empty={<EmptyState icon={Handshake} title="אין כרגע בקשות לשותפים" text="סמנו 'מחפש/ת שותפים' בפוסט כדי שיופיע כאן." />} />
          </TabsContent>
        </Tabs>
      </div>
      <aside className="hidden space-y-4 lg:block">
        <SuggestedMusicians />
        <section className="grain space-y-3 rounded-2xl border-2 border-ink bg-riso-blue p-5 text-white">
          <h2 className="riso-on-blue font-display text-3xl font-bold leading-none">מחפשים במה?</h2>
          <p className="text-sm text-white/80">פרויקטים שמחפשים נגנים, וקורסים ממוזיקאים שעושים את זה כל יום.</p>
          <Button asChild className="w-full justify-start bg-riso-yellow text-ink hover:bg-riso-yellow/90"><Link to="/collabs"><Handshake />פרויקטים פתוחים</Link></Button>
          <Button asChild variant="outline" className="w-full justify-start border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link to="/courses"><GraduationCap />קורסים</Link></Button>
        </section>
      </aside>
    </div>
  );
}
