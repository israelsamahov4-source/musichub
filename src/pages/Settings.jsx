import { useState } from "react";
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
import { supabase, unwrap } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { PAYMENTS_ENABLED } from "@/lib/config";
import { errorMessage, formatDate } from "@/lib/utils";

const STATUS = { active: "פעיל", trialing: "תקופת ניסיון", past_due: "תשלום נכשל", canceled: "בוטל", unpaid: "לא שולם", incomplete: "לא הושלם" };

function PasswordCard() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error("הסיסמה חייבת להכיל לפחות 8 תווים");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    setPw("");
    toast.success("הסיסמה עודכנה");
  };
  return (
    <form onSubmit={save} className="flex flex-wrap items-end gap-2">
      <Field id="newpw" label="סיסמה חדשה"><Input id="newpw" type="password" dir="ltr" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-64" /></Field>
      <Button type="submit" variant="outline" disabled={busy || !pw}>עדכון סיסמה</Button>
    </form>
  );
}

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const qc = useQueryClient();
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const sub = useQuery({
    queryKey: ["subscription", user.id],
    queryFn: async () => unwrap(await supabase.from("subscriptions").select("tier, status, billing_cycle, current_period_end, cancel_at_period_end").eq("user_id", user.id).maybeSingle()),
  });
  const blocks = useQuery({
    queryKey: ["blocks", user.id],
    queryFn: async () => unwrap(await supabase.from("blocks").select("blocked_id, profile:profiles!blocks_blocked_id_fkey(id, username, full_name, avatar_url)").eq("blocker_id", user.id)),
  });
  const unblock = useMutation({
    mutationFn: async (id) => unwrap(await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", id)),
    onSuccess: () => { toast.success("החסימה בוטלה"); qc.invalidateQueries({ queryKey: ["blocks"] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const portal = async () => {
    const { data, error } = await supabase.functions.invoke("billing-portal");
    if (error || !data?.url) return toast.error(errorMessage(error));
    window.location.assign(data.url);
  };
  const deleteAccount = async () => {
    setDeleting(true);
    const { error } = await supabase.functions.invoke("delete-account", { body: { confirm: profile.username } });
    setDeleting(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("החשבון נמחק");
    await signOut();
  };

  const s = sub.data;
  return (
    <div className="page-narrow space-y-5">
      <h1 className="page-title">הגדרות</h1>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">חשבון</h2>
        <div className="flex items-center gap-3">
          <UserAvatar profile={profile} size="md" />
          <div className="flex-1">
            <div className="font-medium">{profile?.full_name}</div>
            <div className="ltr text-sm text-muted-foreground">{user.email}</div>
          </div>
          <Button asChild variant="outline"><Link to="/profile/edit">עריכת פרופיל</Link></Button>
        </div>
        {user.app_metadata?.provider === "email" && <PasswordCard />}
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">מנוי</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span>התוכנית שלך:</span>
          <strong>{(s?.tier ?? "free").replace(/^./, (c) => c.toUpperCase())}</strong>
          <PlanBadge tier={s?.tier} />
          {s?.tier !== "free" && s?.status && <span className="chip">{STATUS[s.status] ?? s.status}</span>}
        </div>
        {s?.current_period_end && s.tier !== "free" && (
          <p className="text-sm text-muted-foreground">
            {s.cancel_at_period_end ? "המנוי יסתיים ב-" : "החיוב הבא ב-"}{formatDate(s.current_period_end)}
          </p>
        )}
        {s?.status === "past_due" && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">התשלום האחרון נכשל. עדכנו אמצעי תשלום כדי לא לאבד את המנוי.</p>}
        <div className="flex gap-2">
          {s?.tier && s.tier !== "free" && PAYMENTS_ENABLED ? <Button variant="outline" onClick={portal}>ניהול מנוי ואמצעי תשלום</Button>
            : <Button asChild variant="outline"><Link to="/pricing">לתוכניות</Link></Button>}
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">משתמשים חסומים</h2>
        {(blocks.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">לא חסמתם אף אחד.</p> : (
          <ul className="space-y-2">
            {blocks.data.map((b) => (
              <li key={b.blocked_id} className="flex items-center gap-2">
                <UserAvatar profile={b.profile} size="xs" />
                <span className="flex-1 text-sm">{b.profile?.full_name || b.profile?.username}</span>
                <Button size="sm" variant="ghost" onClick={() => unblock.mutate(b.blocked_id)}>ביטול חסימה</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-3 border-destructive/40 p-5">
        <h2 className="font-semibold text-destructive">מחיקת חשבון</h2>
        <p className="text-sm text-muted-foreground">מוחק לצמיתות את הפרופיל, הפוסטים, ההודעות, הפרויקטים שבבעלותכם, הקורסים והקבצים שהעליתם. מנוי פעיל יבוטל.</p>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="destructive" className="w-fit">מחיקת החשבון</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>למחוק את החשבון לצמיתות?</AlertDialogTitle>
              <AlertDialogDescription>אי אפשר לבטל את הפעולה. כדי לאשר, הקלידו את שם המשתמש שלכם: <strong className="ltr">{profile?.username}</strong></AlertDialogDescription>
            </AlertDialogHeader>
            <Input dir="ltr" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} aria-label="שם משתמש לאישור" />
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction disabled={confirmName !== profile?.username || deleting} onClick={deleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">מחיקה לצמיתות</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}
