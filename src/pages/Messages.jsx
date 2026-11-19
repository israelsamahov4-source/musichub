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
import { cn, errorMessage, formatDate, timeAgo, textDir } from "@/lib/utils";
import { usePageTitle } from "@/lib/usePageTitle";
import { tr } from "@/lib/i18n";

function ConversationList({ conversations, activeId }) {
  if (!conversations.length) {
    return <EmptyState plain icon={MessageCircle} title={tr("אין עדיין שיחות")} text={tr("פתחו שיחה מתוך פרופיל של מוזיקאי/ת.")} action={<Button asChild variant="outline"><Link to="/discover">{tr("גילוי מוזיקאים")}</Link></Button>} />;
  }
  return (
    <ul className="p-1.5">
      {conversations.map((c) => (
        <li key={c.conversation_id}>
          <Link to={`/messages/${c.conversation_id}`} className={cn("flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted", c.conversation_id === activeId && "bg-secondary hover:bg-secondary")}>
            <UserAvatar profile={{ full_name: c.other_full_name, username: c.other_username, avatar_url: c.other_avatar_url }} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className={cn("truncate", Number(c.unread_count) > 0 ? "font-bold" : "font-medium")}>{c.other_full_name || c.other_username}</span>
                <span className={cn("ms-auto shrink-0 text-xs", Number(c.unread_count) > 0 ? "font-semibold text-primary" : "text-muted-foreground")}>{timeAgo(c.last_message_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="truncate text-sm text-muted-foreground">{c.last_message ?? tr("שיחה חדשה")}</p>
                {Number(c.unread_count) > 0 && <span className="ms-auto min-w-5 rounded-full bg-riso-pinkdeep px-1.5 text-center text-xs font-bold leading-5 text-white">{c.unread_count}</span>}
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
      <div className="flex h-16 items-center gap-3 border-b px-3">
        <Button asChild variant="ghost" size="icon" className="md:hidden" aria-label={tr("חזרה לשיחות")}><Link to="/messages"><ArrowRight className="ltr:rotate-180" /></Link></Button>
        {other && (
          <Link to={`/u/${other.username}`} className="flex items-center gap-2 hover:underline">
            <UserAvatar profile={other} />
            <span className="font-bold">{other.full_name || other.username}</span>
          </Link>
        )}
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto bg-background/60 p-4" aria-live="polite">
        {isLoading && <PageLoader />}
        {!isLoading && messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{tr("כתבו את ההודעה הראשונה בשיחה.")}</p>}
        {messages.map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-start" : "justify-end")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2", mine ? "rounded-ss-md bg-primary text-primary-foreground" : "rounded-se-md bg-card shadow-card")}>
                <p dir={textDir(m.content)} className="whitespace-pre-wrap break-words text-start text-[15px] leading-snug">{m.content}</p>
                <p className={cn("mt-0.5 text-[11px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>{formatDate(m.created_at, "d.M HH:mm")}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={submit} className="flex items-end gap-2 border-t bg-card p-3">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={4000} placeholder={tr("כתבו הודעה…")} aria-label={tr("הודעה")}
          className="max-h-32 min-h-11 resize-none rounded-3xl border-0 bg-muted px-4 py-2.5 focus-visible:bg-card" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={!text.trim()} aria-label={tr("שליחה")}><Send className="rtl:-scale-x-100" /></Button>
      </form>
    </div>
  );
}

export default function Messages() {
  usePageTitle(tr("הודעות"));
  const { conversationId } = useParams();
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => unwrap(await supabase.rpc("my_conversations")) ?? [],
  });
  const active = conversations.find((c) => c.conversation_id === conversationId);
  const other = active && { id: active.other_id, username: active.other_username, full_name: active.other_full_name, avatar_url: active.other_avatar_url };

  return (
    <div className="mx-auto max-w-5xl px-0 py-0 md:px-4 md:py-6">
      <Card className="grid h-[calc(100dvh-7rem-1px)] overflow-hidden rounded-none border-x-0 md:h-[calc(100dvh-8rem)] md:grid-cols-[340px_1fr] md:rounded-2xl md:border-x">
        <div className={cn("overflow-y-auto border-e", conversationId && "hidden md:block")}>
          <h1 className="flex h-16 items-center border-b px-4 text-xl font-bold">{tr("הודעות")}</h1>
          {isLoading ? <PageLoader /> : <ConversationList conversations={conversations} activeId={conversationId} />}
        </div>
        <div className={cn("min-h-0", !conversationId && "hidden md:block")}>
          {conversationId ? (
            !isLoading && !active ? <EmptyState title={tr("השיחה לא נמצאה")} /> : <Thread key={conversationId} conversationId={conversationId} other={other} />
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 bg-background/60 p-8 text-center">
              <span className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary"><MessageCircle className="h-7 w-7" aria-hidden /></span>
              <p className="text-lg font-bold">{tr("ההודעות שלכם")}</p>
              <p className="max-w-xs text-sm text-muted-foreground">{tr("בחרו שיחה מהרשימה, או פתחו חדשה מהפרופיל של מוזיקאי/ת.")}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
