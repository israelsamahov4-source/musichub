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
import { tr } from "@/lib/i18n";

/** Turn two-step verification (authenticator app) on or off. */
export default function TwoFactorCard() {
  const qc = useQueryClient();
  const [enroll, setEnroll] = useState(null); // { id, qr, secret }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const factors = useQuery({
    queryKey: ["mfa-factors"],
    // `all` includes unverified factors left over from an abandoned attempt; `totp` lists only verified ones.
    queryFn: async () => ((await supabase.auth.mfa.listFactors()).data?.all ?? []).filter((f) => f.factor_type === "totp"),
  });
  const active = factors.data?.find((f) => f.status === "verified");

  const start = async () => {
    setBusy(true);
    // Clean up an abandoned, unverified attempt first
    for (const f of factors.data ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Jamly ${Math.random().toString(36).slice(2, 8)}`,
    });
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };
  const confirm = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() });
    setBusy(false);
    if (error) return toast.error(tr("הקוד שגוי. נסו את הקוד הבא שמופיע באפליקציה"));
    toast.success(tr("האימות הדו-שלבי הופעל"));
    setEnroll(null); setCode("");
    qc.invalidateQueries({ queryKey: ["mfa-factors"] });
    qc.invalidateQueries({ queryKey: ["mfa-level"] });
  };
  const cancel = async () => {
    const id = enroll?.id;
    setEnroll(null); setCode("");
    if (id) await supabase.auth.mfa.unenroll({ factorId: id });
    qc.invalidateQueries({ queryKey: ["mfa-factors"] });
  };
  const disable = async () => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: active.id });
    if (error) return toast.error(errorMessage(error));
    await supabase.auth.refreshSession();
    toast.success(tr("האימות הדו-שלבי כובה"));
    qc.invalidateQueries({ queryKey: ["mfa-factors"] });
    qc.invalidateQueries({ queryKey: ["mfa-level"] });
  };

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center gap-2">
        {active ? <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden /> : <ShieldOff className="h-5 w-5 text-muted-foreground" aria-hidden />}
        <h2 className="font-semibold">{tr("אימות דו-שלבי")}</h2>
        {active && <span className="rounded-full bg-[#E2F5E9] px-2.5 py-0.5 text-xs font-semibold text-[#1C6B3A]">{tr("פעיל")}</span>}
      </div>
      <p className="text-sm text-muted-foreground">
        {tr("בכל התחברות תתבקשו גם לקוד מאפליקציית אימות (Google Authenticator, Microsoft Authenticator, 1Password ועוד). כך גם מי שיודע את הסיסמה שלכם לא יוכל להיכנס.")}
      </p>
      {active ? (
        <ConfirmDialog trigger={<Button variant="outline" className="w-fit">{tr("כיבוי")}</Button>} title={tr("לכבות את האימות הדו-שלבי?")}
          description={tr("החשבון יהיה מוגן רק בסיסמה.")} confirmLabel={tr("כיבוי")} destructive onConfirm={disable} />
      ) : enroll ? (
        <form onSubmit={confirm} className="space-y-3">
          <ol className="list-decimal space-y-1 ps-5 text-sm">
            <li>{tr("פתחו את אפליקציית האימות וסרקו את הקוד:")}</li>
          </ol>
          <img src={enroll.qr} alt={tr("קוד QR להוספת החשבון לאפליקציית האימות")} className="h-44 w-44 rounded-xl border bg-white p-2" />
          <p className="text-xs text-muted-foreground">{tr("אי אפשר לסרוק? הקלידו את המפתח:")}{" "}<span className="ltr select-all font-mono">{enroll.secret}</span></p>
          <ol start={2} className="list-decimal ps-5 text-sm"><li>{tr("הקלידו את הקוד שמופיע באפליקציה:")}</li></ol>
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code"
              dir="ltr" className="w-40 text-center font-mono text-lg tracking-[0.3em]" aria-label={tr("קוד אימות")} />
            <Button type="submit" disabled={busy || code.length !== 6}>{tr("הפעלה")}</Button>
            <Button type="button" variant="ghost" onClick={cancel}>{tr("ביטול")}</Button>
          </div>
        </form>
      ) : (
        <Button className="w-fit" onClick={start} disabled={busy || factors.isLoading}>{tr("הפעלת אימות דו-שלבי")}</Button>
      )}
    </Card>
  );
}
