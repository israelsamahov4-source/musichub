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
    <AuthShell title="ברוכים השבים" subtitle="התחברו כדי להמשיך" footer={<>אין לכם חשבון? <Link to={signupHref} className="font-medium text-primary underline decoration-riso-pink decoration-2 underline-offset-4">הרשמה</Link></>}>
      <GoogleButton />
      <form onSubmit={submit} className="space-y-4">
        <Field id="email" label="אימייל">
          <Input id="email" type="email" dir="ltr" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field id="password" label="סיסמה">
          <Input id="password" type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="text-end text-sm"><Link to="/forgot-password" className="text-primary underline decoration-riso-pink decoration-2 underline-offset-4">שכחתי סיסמה</Link></div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "מתחברים…" : "התחברות"}</Button>
      </form>
    </AuthShell>
  );
}
