import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ConfirmDialog from "@/components/ConfirmDialog";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/utils";

/** Turn two-step verification (authenticator app) on or off. */
export default function TwoFactorCard() {
  const qc = useQueryClient();
  const [enroll, setEnroll] = useState(null); // { id, qr, secret }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const factors = useQuery({
    queryKey: ["mfa-factors"],
    queryFn: async () => (await supabase.auth.mfa.listFactors()).data?.totp ?? [],
  });
  const active = factors.data?.find((f) => f.status === "verified");

  const start = async () => {
    setBusy(true);
    // Clean up an abandoned, unverified attempt first
    for (const f of factors.data ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `MusicHub ${new Date().toISOString().slice(0, 10)}` });
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };
  const confirm = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() });
    setBusy(false);
    if (error) return toast.error("הקוד שגוי. נסו את הקוד הבא שמופיע באפליקציה");
    toast.success("האימות הדו-שלבי הופעל");
    setEnroll(null); setCode("");
    qc.invalidateQueries({ queryKey: ["mfa-factors"] });
    qc.invalidateQueries({ queryKey: ["mfa-level"] });
  };
  const disable = async () => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: active.id });
    if (error) return toast.error(errorMessage(error));
    await supabase.auth.refreshSession();
    toast.success("האימות הדו-שלבי כובה");
    qc.invalidateQueries({ queryKey: ["mfa-factors"] });
  };

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center gap-2">
        {active ? <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden /> : <ShieldOff className="h-5 w-5 text-muted-foreground" aria-hidden />}
        <h2 className="font-semibold">אימות דו-שלבי</h2>
        {active && <span className="rounded-md border-2 border-ink bg-riso-yellow px-2 py-0.5 text-xs font-bold text-ink">פעיל</span>}
      </div>
      <p className="text-sm text-muted-foreground">
        בכל התחברות תתבקשו גם לקוד מאפליקציית אימות (Google Authenticator, Microsoft Authenticator, 1Password ועוד). כך גם מי שיודע את הסיסמה שלכם לא יוכל להיכנס.
      </p>
      {active ? (
        <ConfirmDialog trigger={<Button variant="outline" className="w-fit">כיבוי</Button>} title="לכבות את האימות הדו-שלבי?"
          description="החשבון יהיה מוגן רק בסיסמה." confirmLabel="כיבוי" destructive onConfirm={disable} />
      ) : enroll ? (
        <form onSubmit={confirm} className="space-y-3">
          <ol className="list-decimal space-y-1 ps-5 text-sm">
            <li>פתחו את אפליקציית האימות וסרקו את הקוד:</li>
          </ol>
          <img src={enroll.qr} alt="קוד QR להוספת החשבון לאפליקציית האימות" className="h-44 w-44 rounded-xl border bg-white p-2" />
          <p className="text-xs text-muted-foreground">אי אפשר לסרוק? הקלידו את המפתח: <span className="ltr select-all font-mono">{enroll.secret}</span></p>
          <ol start={2} className="list-decimal ps-5 text-sm"><li>הקלידו את הקוד שמופיע באפליקציה:</li></ol>
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code"
              dir="ltr" className="w-40 text-center font-mono text-lg tracking-[0.3em]" aria-label="קוד אימות" />
            <Button type="submit" disabled={busy || code.length !== 6}>הפעלה</Button>
            <Button type="button" variant="ghost" onClick={() => setEnroll(null)}>ביטול</Button>
          </div>
        </form>
      ) : (
        <Button className="w-fit" onClick={start} disabled={busy || factors.isLoading}>הפעלת אימות דו-שלבי</Button>
      )}
    </Card>
  );
}
