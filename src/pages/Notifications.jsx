import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Handshake, Heart, MessageCircle, Sparkles, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import UserAvatar from "@/components/UserAvatar";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import PageLoader from "@/components/PageLoader";
import { supabase, unwrap } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { cn, timeAgo } from "@/lib/utils";

const ICONS = { follow: UserPlus, post_like: Heart, post_comment: MessageCircle, collab_request: Handshake, collab_invite: Handshake, collab_accepted: Handshake, subscription: Sparkles, system: Bell };

export default function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["notifications", user.id],
    queryFn: async () => unwrap(await supabase.from("notifications")
      .select("id, type, message, link, read_at, created_at, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)")
      .order("created_at", { ascending: false }).limit(100)),
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["unread", "notifications"] }); };
  const markAll = useMutation({
    mutationFn: async () => unwrap(await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null).eq("user_id", user.id)),
    onSuccess: refresh,
  });
  const markOne = (id) => supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).then(refresh);
  const clear = useMutation({
    mutationFn: async () => unwrap(await supabase.from("notifications").delete().eq("user_id", user.id).not("read_at", "is", null)),
    onSuccess: refresh,
  });

  if (isLoading) return <PageLoader />;
  const unread = data.filter((n) => !n.read_at).length;
  return (
    <div>
    <PageHeader narrow title="התראות" actions={<>
        {unread > 0 && <Button variant="outline" size="sm" onClick={() => markAll.mutate()}><CheckCheck />סימון הכל כנקרא</Button>}
        {data.length > unread && <Button variant="ghost" size="sm" onClick={() => clear.mutate()}><Trash2 />ניקוי נקראות</Button>}
      </>} />
    <div className="page-narrow">
      {data.length === 0 ? <EmptyState icon={Bell} title="אין התראות" text="כשמישהו יעקוב אחריכם, יגיב או יבקש להצטרף לפרויקט, תראו את זה כאן." /> : (
        <Card className="divide-y">
          {data.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            const body = (
              <div className={cn("flex items-start gap-3 p-4 transition-colors hover:bg-muted", !n.read_at && "bg-secondary/60")}>
                <div className="relative">
                  {n.actor ? <UserAvatar profile={n.actor} /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"><Icon className="h-4 w-4 text-primary" aria-hidden /></div>}
                  {n.actor && <Icon className="absolute -bottom-1 -end-1 h-4 w-4 rounded-full bg-card p-0.5 text-primary" aria-hidden />}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p><strong>{n.actor?.full_name || n.actor?.username}</strong> {n.message}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read_at && <span className="mt-2 h-2 w-2 rounded-full bg-primary" aria-label="לא נקרא" />}
              </div>
            );
            return n.link && n.link.startsWith("/") ? <Link key={n.id} to={n.link} onClick={() => !n.read_at && markOne(n.id)}>{body}</Link> : <div key={n.id}>{body}</div>;
          })}
        </Card>
      )}
    </div>
    </div>
  );
}
