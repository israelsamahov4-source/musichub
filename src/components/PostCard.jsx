import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, Handshake, Heart, Link2, MessageCircle, MoreHorizontal, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import UserAvatar from "@/components/UserAvatar";
import PlanBadge from "@/components/PlanBadge";
import MediaView from "@/components/MediaView";
import { ScoreView } from "@/components/notation";
import Comments from "@/components/Comments";
import ReportDialog from "@/components/ReportDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { supabase, unwrap } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { label } from "@/lib/config";
import { cn, errorMessage, timeAgo, textDir } from "@/lib/utils";
import { DIR, tr } from "@/lib/i18n";

/** Applies a like / unlike to one post inside a cached list (plain array or infinite-query pages). */
function patchPost(old, id, liked) {
  const fix = (p) => (p?.id === id && p.liked_by_me !== liked
    ? { ...p, liked_by_me: liked, like_count: Math.max(0, (p.like_count ?? 0) + (liked ? 1 : -1)) } : p);
  if (!old) return old;
  if (Array.isArray(old)) return old.map(fix);
  if (Array.isArray(old.pages)) return { ...old, pages: old.pages.map((pg) => (Array.isArray(pg) ? pg.map(fix) : pg)) };
  if (old.id === id) return fix(old);
  return old;
}

export default function PostCard({ post, defaultShowComments = false, onDeleted }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  // A list re-created from the cache brings fresh values: follow them.
  useEffect(() => { setLiked(post.liked_by_me); setLikeCount(post.like_count); }, [post.liked_by_me, post.like_count]);
  const mine = user?.id === post.author_id;

  const like = useMutation({
    mutationFn: async (next) => {
      if (next) unwrap(await supabase.from("post_likes").upsert({ post_id: post.id, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true }));
      else unwrap(await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id));
    },
    onMutate: (next) => { setLiked(next); setLikeCount((c) => c + (next ? 1 : -1)); },
    onError: (e, next) => { setLiked(!next); setLikeCount((c) => c + (next ? -1 : 1)); toast.error(errorMessage(e)); },
    onSuccess: (_, next) => {
      // Update this post in every cached list (feed tabs, profile, post page) so it doesn't flip back.
      qc.setQueriesData({ queryKey: ["posts"] }, (old) => patchPost(old, post.id, next));
    },
  });

  const remove = useMutation({
    mutationFn: async () => unwrap(await supabase.from("posts").delete().eq("id", post.id)),
    onSuccess: () => { toast.success(tr("הפוסט נמחק")); qc.invalidateQueries({ queryKey: ["posts"] }); onDeleted?.(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const startChat = async () => {
    const { data, error } = await supabase.rpc("start_conversation", { other_user: post.author_id });
    if (error) return toast.error(errorMessage(error));
    await qc.invalidateQueries({ queryKey: ["conversations"] });
    navigate(`/messages/${data}`);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`);
      toast.success(tr("הקישור הועתק"));
    } catch {
      toast.error(tr("לא הצלחנו להעתיק. אפשר להעתיק את הכתובת מהדפדפן"));
    }
  };

  const a = post.author || {};
  const name = a.full_name || a.username;
  return (
    <Card className="rise">
      <div className="flex items-start gap-3 px-4 pt-4">
        <Link to={`/u/${a.username}`} aria-hidden="true" tabIndex={-1}><UserAvatar profile={a} size="md" /></Link>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-x-2">
            <Link to={`/u/${a.username}`} className="text-[15px] font-bold hover:underline">{name}</Link>
            <PlanBadge tier={a.plan_tier} />
          </div>
          <Link to={`/posts/${post.id}`} className="text-[13px] text-muted-foreground hover:underline">
            <span className="ltr">@{a.username}</span> · {timeAgo(post.created_at)}
          </Link>
        </div>
        <DropdownMenu dir={DIR}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-me-2 -mt-1 text-muted-foreground" aria-label={tr("אפשרויות")}><MoreHorizontal /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={copyLink}><Link2 className="h-4 w-4" />{tr("העתקת קישור")}</DropdownMenuItem>
            {user && !mine && <DropdownMenuItem onClick={() => setReportOpen(true)}><Flag className="h-4 w-4" />{tr("דיווח")}</DropdownMenuItem>}
            {mine && <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" />{tr("מחיקת הפוסט")}</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3 px-4 pt-3">
        {post.collaboration_wanted && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#FFF0F4] px-3 py-2.5 text-sm">
            <Handshake className="h-4 w-4 shrink-0 text-[#B01E4C]" aria-hidden />
            <span className="font-semibold text-[#8E1840]">{name}{" "}{tr("מחפש/ת שותפים")}</span>
            {user && !mine && <Button size="sm" className="ms-auto h-8" onClick={startChat}>{tr("שליחת הודעה")}</Button>}
          </div>
        )}
        {post.content && <p dir={textDir(post.content)} className="whitespace-pre-wrap break-words text-start text-[15px] leading-relaxed">{post.content}</p>}
        {post.media_url && <MediaView url={post.media_url} type={post.media_type} subtitle={name} />}
        {post.notation && <ScoreView abc={post.notation} />}
        {post.genres?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">{post.genres.map((g) => <span key={g} className="chip">{label("genres", g)}</span>)}</div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 border-t border-border/70 px-2 py-1">
        <Button variant="ghost" aria-pressed={liked} disabled={!user || like.isPending} onClick={() => like.mutate(!liked)}
          className={cn("rounded-xl", liked ? "text-[#B01E4C] hover:text-[#B01E4C]" : "text-muted-foreground")}>
          <Heart className={cn("transition-transform duration-200", liked && "scale-110 fill-riso-pink text-riso-pink")} />
          <span className="tabular">{likeCount > 0 ? likeCount : tr("לייק")}</span><span className="sr-only">{tr("לייקים")}</span>
        </Button>
        <Button variant="ghost" className="rounded-xl text-muted-foreground" onClick={() => setShowComments((s) => !s)} aria-expanded={showComments}>
          <MessageCircle /><span className="tabular">{post.comment_count > 0 ? post.comment_count : tr("תגובה")}</span><span className="sr-only">{tr("תגובות")}</span>
        </Button>
        <Button variant="ghost" className="rounded-xl text-muted-foreground" onClick={copyLink}>
          <Share2 />{tr("שיתוף")}
        </Button>
      </div>
      {showComments && <div className="px-4 pb-4"><Comments post={post} /></div>}
      {mine && (
        <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete}
          title={tr("למחוק את הפוסט?")} description={tr("אי אפשר לשחזר פוסט שנמחק.")} confirmLabel={tr("מחיקה")} destructive
          onConfirm={() => remove.mutate()} />
      )}
      {user && !mine && <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="post" targetId={post.id} />}
    </Card>
  );
}
