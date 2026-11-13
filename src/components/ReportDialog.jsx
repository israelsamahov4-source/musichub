import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { errorMessage } from "@/lib/utils";

/** Lets users report abusive content; reports land in the `reports` table for review. */
export default function ReportDialog({ open, onOpenChange, targetType, targetId }) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id, target_type: targetType, target_id: targetId, reason: reason.trim(),
    });
    setSending(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("תודה, הדיווח התקבל ונבדוק אותו");
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>דיווח על תוכן</DialogTitle>
          <DialogDescription>ספרו לנו מה הבעיה. הדיווח אנונימי כלפי המשתמש המדווח.</DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={4} placeholder="לדוגמה: ספאם, הטרדה, תוכן פוגעני…" aria-label="סיבת הדיווח" />
        <DialogFooter>
          <Button onClick={submit} disabled={sending || reason.trim().length < 3}>שליחת דיווח</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
