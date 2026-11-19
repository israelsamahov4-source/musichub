import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import UserAvatar from "@/components/UserAvatar";
import { supabase, unwrap } from "@/lib/supabase";
import { AUTHOR } from "@/api/posts";
import { useAuth } from "@/auth/AuthProvider";
import { errorMessage, timeAgo, textDir } from "@/lib/utils";
import { useAuthHref } from "@/auth/returnTo";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Comments({ post }) {
  const loginHref = useAuthHref("/login");
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const key = ["comments", post.id];

  const { data: comments = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () =>
      unwrap(await supabase.from("post_comments").select(`id, content, created_at, author_id, author:profiles!post_comments_author_id_fkey(${AUTHOR})`)
        .eq("post_id", post.id).order("created_at")),
  });

  const add = useMutation({
    mutationFn: async () =>
      unwrap(await supabase.from("post_comments").insert({ post_id: post.id, author_id: user.id, content: text.trim() })),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["posts"] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id) => unwrap(await supabase.from("post_comments").delete().eq("id", id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["posts"] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="space-y-3 border-t pt-3">
      {isLoading && <p className="text-sm text-muted-foreground">טוען תגובות…</p>}
      {comments.map((c) => (
        <div key={c.id} className="group flex gap-2">
          <Link to={`/u/${c.author?.username}`} aria-hidden="true" tabIndex={-1}><UserAvatar profile={c.author} size="xs" /></Link>
          <div className="min-w-0 flex-1 rounded-lg bg-muted px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              <Link to={`/u/${c.author?.username}`} className="font-semibold hover:underline">{c.author?.full_name || c.author?.username}</Link>
              <span className="text-muted-foreground">{timeAgo(c.created_at)}</span>
              {user && (c.author_id === user.id || post.author_id === user.id) && (
                <ConfirmDialog title="למחוק את התגובה?" confirmLabel="מחיקה" destructive onConfirm={() => remove.mutate(c.id)} trigger={
                  <button type="button" className="ms-auto -m-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-opacity hover:text-destructive [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:focus-visible:opacity-100 [@media(hover:hover)]:group-hover:opacity-100" aria-label="מחיקת תגובה">
                    <Trash2 className="h-4 w-4" />
                  </button>} />
              )}
            </div>
            <p dir={textDir(c.content)} className="whitespace-pre-wrap break-words text-start text-sm">{c.content}</p>
          </div>
        </div>
      ))}
      {user ? (
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) add.mutate(); }}>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={2000} placeholder="כתבו תגובה…" aria-label="תגובה" className="min-h-9 resize-none" />
          <Button type="submit" size="icon" disabled={!text.trim() || add.isPending} aria-label="שליחת תגובה"><Send className="rtl:-scale-x-100" /></Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground"><Link to={loginHref} className="font-semibold text-primary hover:underline">התחברו</Link> כדי להגיב</p>
      )}
    </div>
  );
}
