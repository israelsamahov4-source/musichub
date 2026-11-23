import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, FileMusic, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ScoreEditorDialog, ScoreView } from "@/components/notation";
import { supabase, unwrap } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { cn, errorMessage, timeAgo } from "@/lib/utils";
import { tr } from "@/lib/i18n";

/**
 * Sheet music inside a shared project: every active member can write, open and edit;
 * whoever wrote a piece, or the project owner, can delete it.
 */
export default function ProjectScores({ projectId, isOwner }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["project-scores", projectId];
  const [openId, setOpenId] = useState(null); // which piece is shown
  const [editing, setEditing] = useState(null); // { id?, notation } while the editor is open

  const { data: scores = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await supabase.from("collab_scores")
      .select("id, title, notation, created_by, updated_at, editor:profiles!collab_scores_updated_by_fkey(full_name, username)")
      .eq("project_id", projectId).order("updated_at", { ascending: false })),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const onErr = (e) => toast.error(errorMessage(e));

  const save = useMutation({
    mutationFn: async ({ id, notation, title }) => {
      const values = { notation, title: (title || "").slice(0, 120) };
      if (id) return unwrap(await supabase.from("collab_scores").update(values).eq("id", id).select("id").single());
      return unwrap(await supabase.from("collab_scores").insert({ ...values, project_id: projectId }).select("id").single());
    },
    onSuccess: (row) => { setEditing(null); setOpenId(row?.id ?? null); refresh(); toast.success(tr("התווים נשמרו")); },
    onError: onErr,
  });
  const remove = useMutation({
    mutationFn: async (id) => unwrap(await supabase.from("collab_scores").delete().eq("id", id)),
    onSuccess: refresh, onError: onErr,
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-semibold">{tr("תווים")}{scores.length > 0 && ` (${scores.length})`}</h2>
        <Button size="sm" variant="ghost" className="ms-auto" onClick={() => setEditing({ notation: null })}><Plus />{tr("כתיבת תווים")}</Button>
      </div>

      {!isLoading && scores.length === 0 && (
        <p className="rounded-lg bg-muted/60 p-4 text-center text-sm text-muted-foreground">{tr("עוד אין תווים בפרויקט. כתבו מנגינה, תפקיד לכלי או רצף אקורדים, וכל חברי הפרויקט יוכלו לפתוח ולערוך.")}</p>
      )}

      <ul className="space-y-2">
        {scores.map((s) => {
          const shown = openId === s.id;
          const canDelete = s.created_by === user.id || isOwner;
          return (
            <li key={s.id} className="rounded-lg border bg-card">
              <div className="flex items-center gap-2 p-2.5">
                <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-start" onClick={() => setOpenId(shown ? null : s.id)} aria-expanded={shown}>
                  <FileMusic className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.title || tr("תווים ללא שם")}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {tr("עודכן")}{" "}{timeAgo(s.updated_at)}{s.editor && <>{" · "}{s.editor.full_name || s.editor.username}</>}
                    </span>
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", shown && "rotate-180")} aria-hidden />
                </button>
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={tr("עריכת התווים")} onClick={() => setEditing({ id: s.id, notation: s.notation })}><Pencil className="h-4 w-4" /></Button>
                {canDelete && (
                  <ConfirmDialog title={tr("למחוק את התווים?")} description={tr("התווים יימחקו לכל חברי הפרויקט.")} confirmLabel={tr("מחיקה")} destructive
                    onConfirm={() => remove.mutate(s.id)}
                    trigger={<Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={tr("מחיקת התווים")}><Trash2 className="h-4 w-4" /></Button>} />
                )}
              </div>
              {shown && <div className="border-t p-2.5"><ScoreView abc={s.notation} /></div>}
            </li>
          );
        })}
      </ul>

      <ScoreEditorDialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)} initialAbc={editing?.notation}
        heading={editing?.id ? tr("עריכת תווים בפרויקט") : tr("תווים חדשים לפרויקט")} saving={save.isPending}
        onSave={(notation, title) => save.mutate({ id: editing?.id, notation, title })} />
    </Card>
  );
}
