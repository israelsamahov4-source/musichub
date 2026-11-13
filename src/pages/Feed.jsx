import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Handshake, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostComposer from "@/components/PostComposer";
import PostList from "@/components/PostList";
import EmptyState from "@/components/EmptyState";
import SuggestedMusicians from "@/components/SuggestedMusicians";
import { fetchFollowingIds } from "@/api/posts";
import { useAuth } from "@/auth/AuthProvider";

export default function Feed() {
  const { user } = useAuth();
  const following = useQuery({ queryKey: ["following-ids", user.id], queryFn: () => fetchFollowingIds(user.id) });
  const authorIds = following.data ? [user.id, ...following.data] : null;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
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
        <Card className="space-y-3 p-4">
          <h2 className="font-semibold">מה עוד אפשר לעשות?</h2>
          <Button asChild variant="outline" className="w-full justify-start"><Link to="/collabs"><Handshake />מצאו פרויקט להצטרף אליו</Link></Button>
          <Button asChild variant="outline" className="w-full justify-start"><Link to="/courses"><GraduationCap />למדו מקורסים</Link></Button>
        </Card>
      </aside>
    </div>
  );
}
