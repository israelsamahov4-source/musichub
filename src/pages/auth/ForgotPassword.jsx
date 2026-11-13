import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Field from "@/components/Field";
import AuthShell from "./AuthShell";
import { supabase } from "@/lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    // Same message whether or not the address exists, so accounts can't be enumerated.
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    setSent(true);
  };

  return (
    <AuthShell title="איפוס סיסמה" footer={<Link to="/login" className="text-primary hover:underline">חזרה להתחברות</Link>}>
      {sent ? (
        <p>אם קיים חשבון עם הכתובת הזו, שלחנו אליה קישור לאיפוס הסיסמה.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted-foreground">הזינו את האימייל שלכם ונשלח קישור לבחירת סיסמה חדשה.</p>
          <Field id="email" label="אימייל">
            <Input id="email" type="email" dir="ltr" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" disabled={busy}>שליחת קישור</Button>
        </form>
      )}
    </AuthShell>
  );
}
