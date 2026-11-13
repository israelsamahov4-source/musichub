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
import { errorMessage, timeAgo } from "@/lib/utils";

export default function Comments({ post }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const key = ["comments", post.id];

  const { data: comments = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () =>
      unwrap(await supabase.from("post_comments").select(`id, content, created_at, author_id, author:profiles(${AUTHOR})`)
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
          <Link to={`/u/${c.author?.username}`}><UserAvatar profile={c.author} size="xs" /></Link>
          <div className="min-w-0 flex-1 rounded-lg bg-muted px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              <Link to={`/u/${c.author?.username}`} className="font-semibold hover:underline">{c.author?.full_name || c.author?.username}</Link>
              <span className="text-muted-foreground">{timeAgo(c.created_at)}</span>
              {user && (c.author_id === user.id || post.author_id === user.id) && (
                <button onClick={() => remove.mutate(c.id)} className="ms-auto text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100" aria-label="מחיקת תגובה">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap break-words text-sm">{c.content}</p>
          </div>
        </div>
      ))}
      {user ? (
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) add.mutate(); }}>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={2000} placeholder="כתבו תגובה…" aria-label="תגובה" className="min-h-9 resize-none" />
          <Button type="submit" size="icon" disabled={!text.trim() || add.isPending} aria-label="שליחת תגובה"><Send className="rtl:-scale-x-100" /></Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground"><Link to="/login" className="text-primary hover:underline">התחברו</Link> כדי להגיב</p>
      )}
    </div>
  );
}
