import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Field from "@/components/Field";
import AuthShell from "./AuthShell";
import GoogleButton from "./GoogleButton";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/utils";
import { safeNext } from "@/auth/guards";
import { useAuthHref } from "@/auth/returnTo";
import { tr } from "@/lib/i18n";

export default function Login() {
  const signupHref = useAuthHref("/signup");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    navigate(safeNext(), { replace: true });
  };

  return (
    <AuthShell title={tr("ברוכים השבים")} subtitle={tr("התחברו כדי להמשיך")} footer={<>{tr("אין לכם חשבון?")}{" "}<Link to={signupHref} className="font-medium font-semibold text-primary hover:underline">{tr("הרשמה")}</Link></>}>
      <GoogleButton />
      <form onSubmit={submit} className="space-y-4">
        <Field id="email" label={tr("אימייל")}>
          <Input id="email" type="email" dir="ltr" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field id="password" label={tr("סיסמה")}>
          <Input id="password" type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="text-end text-sm"><Link to="/forgot-password" className="font-semibold text-primary hover:underline">{tr("שכחתי סיסמה")}</Link></div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? tr("מתחברים…") : tr("התחברות")}</Button>
      </form>
    </AuthShell>
  );
}
