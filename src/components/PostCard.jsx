import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, Handshake, Heart, Link2, MessageCircle, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import UserAvatar from "@/components/UserAvatar";
import PlanBadge from "@/components/PlanBadge";
import MediaView from "@/components/MediaView";
import Comments from "@/components/Comments";
import ReportDialog from "@/components/ReportDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { supabase, unwrap } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { label } from "@/lib/config";
import { cn, errorMessage, timeAgo } from "@/lib/utils";

export default function PostCard({ post, defaultShowComments = false, onDeleted }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [reportOpen, setReportOpen] = useState(false);
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const mine = user?.id === post.author_id;

  const like = useMutation({
    mutationFn: async (next) => {
      if (next) unwrap(await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id }));
      else unwrap(await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id));
    },
    onMutate: (next) => { setLiked(next); setLikeCount((c) => c + (next ? 1 : -1)); },
    onError: (e, next) => { setLiked(!next); setLikeCount((c) => c + (next ? -1 : 1)); toast.error(errorMessage(e)); },
  });

  const remove = useMutation({
    mutationFn: async () => unwrap(await supabase.from("posts").delete().eq("id", post.id)),
    onSuccess: () => { toast.success("הפוסט נמחק"); qc.invalidateQueries({ queryKey: ["posts"] }); onDeleted?.(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const startChat = async () => {
    const { data, error } = await supabase.rpc("start_conversation", { other_user: post.author_id });
    if (error) return toast.error(errorMessage(error));
    navigate(`/messages/${data}`);
  };

  const copyLink = async () => {
    await navigator.clipboard?.writeText(`${window.location.origin}/posts/${post.id}`);
    toast.success("הקישור הועתק");
  };

  const a = post.author || {};
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Link to={`/u/${a.username}`}><UserAvatar profile={a} /></Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <Link to={`/u/${a.username}`} className="font-semibold hover:underline">{a.full_name || a.username}</Link>
            <PlanBadge tier={a.plan_tier} />
          </div>
          <Link to={`/posts/${post.id}`} className="text-xs text-muted-foreground hover:underline">
            <span className="ltr">@{a.username}</span> · {timeAgo(post.created_at)}
          </Link>
        </div>
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="אפשרויות"><MoreHorizontal /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={copyLink}><Link2 className="h-4 w-4" />העתקת קישור</DropdownMenuItem>
            {user && !mine && <DropdownMenuItem onClick={() => setReportOpen(true)}><Flag className="h-4 w-4" />דיווח</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {post.collaboration_wanted && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
          <Handshake className="h-3.5 w-3.5" aria-hidden />מחפש/ת שותפים
        </div>
      )}
      {post.content && <p className="mt-3 whitespace-pre-wrap break-words leading-relaxed">{post.content}</p>}
      {post.media_url && <div className="mt-3"><MediaView url={post.media_url} type={post.media_type} /></div>}
      {post.genres?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">{post.genres.map((g) => <span key={g} className="chip">{label("genres", g)}</span>)}</div>
      )}

      <div className="mt-3 flex items-center gap-1 border-t pt-2">
        <Button variant="ghost" size="sm" aria-pressed={liked} disabled={!user || like.isPending} onClick={() => like.mutate(!liked)}
          className={cn(liked && "text-rose-600 hover:text-rose-700")}>
          <Heart className={cn(liked && "fill-current")} />{likeCount > 0 && likeCount}<span className="sr-only">לייקים</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowComments((s) => !s)} aria-expanded={showComments}>
          <MessageCircle />{post.comment_count > 0 && post.comment_count}<span className="sr-only">תגובות</span>
        </Button>
        {user && !mine && post.collaboration_wanted && (
          <Button variant="ghost" size="sm" className="ms-auto text-primary" onClick={startChat}>
            <Handshake />שליחת הודעה
          </Button>
        )}
        {mine && (
          <ConfirmDialog
            trigger={<Button variant="ghost" size="sm" className="ms-auto text-muted-foreground"><Trash2 />מחיקה</Button>}
            title="למחוק את הפוסט?" description="אי אפשר לשחזר פוסט שנמחק." confirmLabel="מחיקה" destructive
            onConfirm={() => remove.mutate()}
          />
        )}
      </div>
      {showComments && <Comments post={post} />}
      {user && !mine && <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="post" targetId={post.id} />}
    </Card>
  );
}
