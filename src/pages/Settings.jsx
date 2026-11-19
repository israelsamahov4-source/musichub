import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Field from "@/components/Field";
import UserAvatar from "@/components/UserAvatar";
import PlanBadge from "@/components/PlanBadge";
import PageHeader from "@/components/PageHeader";
import TwoFactorCard from "@/components/TwoFactorCard";
import { downloadMyData } from "@/lib/exportData";
import { supabase, unwrap, callFunction } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { PAYMENTS_ENABLED } from "@/lib/config";
import { errorMessage, formatDate } from "@/lib/utils";
import { tr } from "@/lib/i18n";

const STATUS = { active: tr("פעיל"), trialing: tr("תקופת ניסיון"), past_due: tr("תשלום נכשל"), paused: tr("מושהה"), canceled: tr("בוטל") };

function PasswordCard() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error(tr("הסיסמה חייבת להכיל לפחות 8 תווים"));
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    setPw("");
    toast.success(tr("הסיסמה עודכנה"));
  };
  return (
    <form onSubmit={save} className="flex flex-wrap items-end gap-2">
      <Field id="newpw" label={tr("סיסמה חדשה")}><Input id="newpw" type="password" dir="ltr" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-64" /></Field>
      <Button type="submit" variant="outline" disabled={busy || !pw}>{tr("עדכון סיסמה")}</Button>
    </form>
  );
}

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const qc = useQueryClient();
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Read once, then remove ?checkout=success from the address so a reload doesn't repeat the message.
  const [checkoutDone] = useState(() => new URLSearchParams(window.location.search).get("checkout") === "success");
  const [pollUntil] = useState(() => Date.now() + 90_000);
  useEffect(() => {
    if (checkoutDone) window.history.replaceState(null, "", window.location.pathname);
  }, [checkoutDone]);

  const sub = useQuery({
    queryKey: ["subscription", user.id],
    // Right after paying, the webhook may take a few seconds: poll until the plan shows up.
    // Stop after 90 seconds; if the plan still hasn't arrived something needs a human look.
    refetchInterval: (q) => (checkoutDone && q.state.data?.tier === "free" && Date.now() < pollUntil ? 3000 : false),
    queryFn: async () => unwrap(await supabase.from("subscriptions").select("tier, status, billing_cycle, current_period_end, cancel_at_period_end, provider_customer_id").eq("user_id", user.id).maybeSingle()),
  });
  const blocks = useQuery({
    queryKey: ["blocks", user.id],
    queryFn: async () => unwrap(await supabase.from("blocks").select("blocked_id, profile:profiles!blocks_blocked_id_fkey(id, username, full_name, avatar_url)").eq("blocker_id", user.id)),
  });
  const unblock = useMutation({
    mutationFn: async (id) => unwrap(await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", id)),
    onSuccess: () => { toast.success(tr("החסימה בוטלה")); qc.invalidateQueries({ queryKey: ["blocks"] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  useEffect(() => {
    if (checkoutDone) toast.success(tr("התשלום התקבל! המנוי יופעל תוך כמה שניות"));
  }, [checkoutDone]);
  useEffect(() => {
    if (checkoutDone && sub.data && sub.data.tier !== "free") qc.invalidateQueries({ queryKey: ["profile"] });
  }, [checkoutDone, sub.data, qc]);

  const portal = async () => {
    try {
      const data = await callFunction("billing-portal");
      if (!data?.url) throw new Error("portal failed");
      window.location.assign(data.url);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await callFunction("delete-account", { confirm: profile.username });
    } catch (e) {
      setDeleting(false);
      return toast.error(errorMessage(e));
    }
    setDeleting(false);
    toast.success(tr("החשבון נמחק"));
    await signOut();
  };

  const s = sub.data;
  return (
    <div>
    <PageHeader narrow title={tr("הגדרות")} />
    <div className="page-narrow space-y-5">

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">{tr("חשבון")}</h2>
        <div className="flex items-center gap-3">
          <UserAvatar profile={profile} size="md" />
          <div className="flex-1">
            <div className="font-medium">{profile?.full_name}</div>
            <div className="ltr text-sm text-muted-foreground">{user.email}</div>
          </div>
          <Button asChild variant="outline"><Link to="/profile/edit">{tr("עריכת פרופיל")}</Link></Button>
        </div>
        {user.app_metadata?.provider === "email" && <PasswordCard />}
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">{tr("מנוי")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span>{tr("התוכנית שלכם:")}</span>
          <strong>{(s?.tier ?? "free").replace(/^./, (c) => c.toUpperCase())}</strong>
          <PlanBadge tier={s?.tier} />
          {s?.tier !== "free" && s?.status && <span className="chip">{STATUS[s.status] ?? s.status}</span>}
        </div>
        {s?.current_period_end && s.tier !== "free" && (
          <p className="text-sm text-muted-foreground">
            {s.cancel_at_period_end ? tr("המנוי יסתיים ב-") : tr("החיוב הבא ב-")}{formatDate(s.current_period_end)}
          </p>
        )}
        {s?.status === "past_due" && <p className="rounded-xl bg-[#FFF6D9] px-3 py-2.5 text-sm text-[#6E5200]">{tr("התשלום האחרון נכשל. עדכנו אמצעי תשלום כדי לא לאבד את המנוי.")}</p>}
        <div className="flex gap-2">
          {s?.tier && s.tier !== "free" && PAYMENTS_ENABLED ? <Button variant="outline" onClick={portal}>{tr("ניהול מנוי ואמצעי תשלום")}</Button>
            : <Button asChild variant="outline"><Link to="/pricing">{tr("לתוכניות")}</Link></Button>}
          {s?.tier === "free" && s?.provider_customer_id && PAYMENTS_ENABLED && <Button variant="ghost" onClick={portal}>{tr("חשבוניות קודמות")}</Button>}
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">{tr("משתמשים חסומים")}</h2>
        {(blocks.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">{tr("לא חסמתם אף אחד.")}</p> : (
          <ul className="space-y-2">
            {blocks.data.map((b) => (
              <li key={b.blocked_id} className="flex items-center gap-2">
                <UserAvatar profile={b.profile} size="xs" />
                <span className="flex-1 text-sm">{b.profile?.full_name || b.profile?.username}</span>
                <Button size="sm" variant="ghost" onClick={() => unblock.mutate(b.blocked_id)}>{tr("ביטול חסימה")}</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <TwoFactorCard />

      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">{tr("המידע שלכם")}</h2>
        <p className="text-sm text-muted-foreground">{tr("הורדת קובץ עם כל מה שנשמר עליכם באתר: פרופיל, קורות חיים, פוסטים, הודעות, פרויקטים, קורסים והתראות.")}</p>
        <Button variant="outline" className="w-fit" disabled={exporting} onClick={async () => {
          setExporting(true);
          try { await downloadMyData(user.id, user.email); } catch (e) { toast.error(errorMessage(e)); } finally { setExporting(false); }
        }}>{exporting ? tr("מכינים קובץ…") : tr("הורדת המידע שלי")}</Button>
      </Card>

      <Card className="space-y-3 border-destructive/40 p-5">
        <h2 className="font-semibold text-destructive">{tr("מחיקת חשבון")}</h2>
        <p className="text-sm text-muted-foreground">{tr("מוחק לצמיתות את הפרופיל, הפוסטים, ההודעות, הפרויקטים שבבעלותכם, הקורסים והקבצים שהעליתם. מנוי פעיל יבוטל.")}</p>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="destructive" className="w-fit">{tr("מחיקת החשבון")}</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{tr("למחוק את החשבון לצמיתות?")}</AlertDialogTitle>
              <AlertDialogDescription>{tr("אי אפשר לבטל את הפעולה. כדי לאשר, הקלידו את שם המשתמש שלכם:")}{" "}<strong className="ltr">{profile?.username}</strong></AlertDialogDescription>
            </AlertDialogHeader>
            <Input dir="ltr" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} aria-label={tr("שם משתמש לאישור")} />
            <AlertDialogFooter>
              <AlertDialogCancel>{tr("ביטול")}</AlertDialogCancel>
              <AlertDialogAction disabled={confirmName !== profile?.username || deleting} onClick={deleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{tr("מחיקה לצמיתות")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
    </div>
  );
}
