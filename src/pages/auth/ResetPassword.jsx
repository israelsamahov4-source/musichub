import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Field from "@/components/Field";
import PageLoader from "@/components/PageLoader";
import AuthShell from "./AuthShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { errorMessage } from "@/lib/utils";

export default function ResetPassword() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <PageLoader />;
  if (!user) {
    return (
      <AuthShell title="הקישור פג תוקף">
        <p className="mb-4">קישור האיפוס אינו תקף יותר. אפשר לבקש קישור חדש.</p>
        <Button asChild className="w-full"><Link to="/forgot-password">קישור חדש</Link></Button>
      </AuthShell>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("הסיסמה חייבת להכיל לפחות 8 תווים");
    if (password !== confirm) return toast.error("הסיסמאות אינן תואמות");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("הסיסמה עודכנה");
    navigate("/feed", { replace: true });
  };

  return (
    <AuthShell title="בחירת סיסמה חדשה">
      <form onSubmit={submit} className="space-y-4">
        <Field id="password" label="סיסמה חדשה" hint="לפחות 8 תווים">
          <Input id="password" type="password" dir="ltr" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field id="confirm" label="אימות סיסמה">
          <Input id="confirm" type="password" dir="ltr" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <Button type="submit" className="w-full" disabled={busy}>שמירה</Button>
      </form>
    </AuthShell>
  );
}
