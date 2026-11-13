import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthShell from "@/pages/auth/AuthShell";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/utils";

/** Second sign-in step for users who turned on two-step verification. */
export default function MfaChallenge({ onDone }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.find((f) => f.status === "verified");
    if (!factor) { setBusy(false); return toast.error("לא נמצא אמצעי אימות"); }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    setBusy(false);
    if (error) return toast.error(/invalid|expired/i.test(error.message) ? "הקוד שגוי או שפג תוקפו" : errorMessage(error));
    onDone?.();
  };

  return (
    <AuthShell title="אימות דו-שלבי" subtitle="הקלידו את הקוד בן 6 הספרות מאפליקציית האימות שלכם."
      footer={<button className="text-primary underline" onClick={() => supabase.auth.signOut()}>התנתקות</button>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
          <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden />החשבון מוגן באימות דו-שלבי.
        </div>
        <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code"
          dir="ltr" className="h-14 text-center font-mono text-2xl tracking-[0.5em]" aria-label="קוד אימות" autoFocus />
        <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>אימות</Button>
      </form>
    </AuthShell>
  );
}
