import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import UserAvatar from "@/components/UserAvatar";
import EmptyState from "@/components/EmptyState";
import PageLoader from "@/components/PageLoader";
import { supabase, unwrap } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { cn, errorMessage, formatDate, timeAgo } from "@/lib/utils";

function ConversationList({ conversations, activeId }) {
  if (!conversations.length) {
    return <EmptyState icon={MessageCircle} title="אין עדיין שיחות" text="פתחו שיחה מתוך פרופיל של מוזיקאי/ת." action={<Button asChild variant="outline"><Link to="/discover">גילוי מוזיקאים</Link></Button>} />;
  }
  return (
    <ul className="divide-y">
      {conversations.map((c) => (
        <li key={c.conversation_id}>
          <Link to={`/messages/${c.conversation_id}`} className={cn("flex items-center gap-3 p-3 transition-colors hover:bg-muted", c.conversation_id === activeId && "bg-secondary")}>
            <UserAvatar profile={{ full_name: c.other_full_name, username: c.other_username, avatar_url: c.other_avatar_url }} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className={cn("truncate", Number(c.unread_count) > 0 ? "font-bold" : "font-medium")}>{c.other_full_name || c.other_username}</span>
                <span className="ms-auto shrink-0 text-[11px] text-muted-foreground">{timeAgo(c.last_message_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="truncate text-sm text-muted-foreground">{c.last_message ?? "שיחה חדשה"}</p>
                {Number(c.unread_count) > 0 && <span className="ms-auto rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{c.unread_count}</span>}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Thread({ conversationId, other }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const bottomRef = useRef(null);
  const key = ["messages", conversationId];

  const { data: messages = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const rows = unwrap(await supabase.from("messages").select("id, sender_id, content, created_at")
        .eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(200));
      return rows.reverse();
    },
  });

  // Live updates + mark as read
  useEffect(() => {
    const markRead = () =>
      supabase.from("conversation_members").update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId).eq("user_id", user.id)
        .then(() => { qc.invalidateQueries({ queryKey: ["unread", "messages"] }); qc.invalidateQueries({ queryKey: ["conversations"] }); });
    markRead();
    const channel = supabase.channel(`conv-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        qc.setQueryData(key, (old = []) => (old.some((m) => m.id === payload.new.id) ? old : [...old, payload.new]));
        if (payload.new.sender_id !== user.id) markRead();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  const send = useMutation({
    mutationFn: async (content) =>
      unwrap(await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, content }).select().single()),
    onSuccess: (msg) => {
      qc.setQueryData(key, (old = []) => (old.some((m) => m.id === msg.id) ? old : [...old, msg]));
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e, content) => { setText(content); toast.error(errorMessage(e)); },
  });

  const submit = (e) => {
    e?.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    send.mutate(content);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b p-3">
        <Button asChild variant="ghost" size="icon" className="md:hidden" aria-label="חזרה לשיחות"><Link to="/messages"><ArrowRight /></Link></Button>
        {other && (
          <Link to={`/u/${other.username}`} className="flex items-center gap-2 hover:underline">
            <UserAvatar profile={other} />
            <span className="font-semibold">{other.full_name || other.username}</span>
          </Link>
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
        {isLoading && <PageLoader />}
        {!isLoading && messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">כתבו את ההודעה הראשונה 👋</p>}
        {messages.map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-start" : "justify-end")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2", mine ? "rounded-ss-sm bg-primary text-primary-foreground" : "rounded-se-sm bg-muted")}>
                <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                <p className={cn("mt-0.5 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>{formatDate(m.created_at, "d.M HH:mm")}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={submit} className="flex items-end gap-2 border-t p-3">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={4000} placeholder="כתבו הודעה…" aria-label="הודעה"
          className="max-h-32 min-h-10 resize-none" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} />
        <Button type="submit" size="icon" disabled={!text.trim()} aria-label="שליחה"><Send className="rtl:-scale-x-100" /></Button>
      </form>
    </div>
  );
}

export default function Messages() {
  const { conversationId } = useParams();
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => unwrap(await supabase.rpc("my_conversations")),
  });
  const active = conversations.find((c) => c.conversation_id === conversationId);
  const other = active && { id: active.other_id, username: active.other_username, full_name: active.other_full_name, avatar_url: active.other_avatar_url };

  return (
    <div className="mx-auto max-w-5xl px-0 py-0 md:px-4 md:py-6">
      <Card className="grid h-[calc(100dvh-8.5rem)] overflow-hidden rounded-none md:h-[calc(100dvh-8rem)] md:grid-cols-[320px_1fr] md:rounded-xl">
        <div className={cn("overflow-y-auto border-e", conversationId && "hidden md:block")}>
          <h1 className="border-b p-4 text-lg font-bold">הודעות</h1>
          {isLoading ? <PageLoader /> : <ConversationList conversations={conversations} activeId={conversationId} />}
        </div>
        <div className={cn("min-h-0", !conversationId && "hidden md:block")}>
          {conversationId ? (
            !isLoading && !active ? <EmptyState title="השיחה לא נמצאה" /> : <Thread key={conversationId} conversationId={conversationId} other={other} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">בחרו שיחה מהרשימה</div>
          )}
        </div>
      </Card>
    </div>
  );
}
