import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import Field from "@/components/Field";
import AuthShell from "./AuthShell";
import GoogleButton from "./GoogleButton";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/utils";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error("הסיסמה חייבת להכיל לפחות 8 תווים");
    if (!agree) return toast.error("יש לאשר את תנאי השימוש ומדיניות הפרטיות");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { full_name: form.fullName.trim().slice(0, 80) },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    if (data.session) navigate("/onboarding", { replace: true });
    else setSentTo(form.email.trim());
  };

  if (sentTo) {
    return (
      <AuthShell title="כמעט סיימנו!">
        <div className="space-y-3 text-center">
          <MailCheck className="mx-auto h-12 w-12 text-primary" aria-hidden />
          <p>שלחנו קישור אישור אל <strong className="ltr">{sentTo}</strong>.</p>
          <p className="text-sm text-muted-foreground">לחצו על הקישור במייל כדי להפעיל את החשבון. לא הגיע? בדקו בתיקיית הספאם.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="הצטרפות" subtitle="יוצרים פרופיל ומתחילים להתחבר למוזיקאים" footer={<>כבר יש לכם חשבון? <Link to="/login" className="font-medium text-primary hover:underline">התחברות</Link></>}>
      <GoogleButton />
      <form onSubmit={submit} className="space-y-4">
        <Field id="fullName" label="שם מלא">
          <Input id="fullName" autoComplete="name" required maxLength={80} value={form.fullName} onChange={set("fullName")} />
        </Field>
        <Field id="email" label="אימייל">
          <Input id="email" type="email" dir="ltr" autoComplete="email" required value={form.email} onChange={set("email")} />
        </Field>
        <Field id="password" label="סיסמה" hint="לפחות 8 תווים">
          <Input id="password" type="password" dir="ltr" autoComplete="new-password" required minLength={8} value={form.password} onChange={set("password")} />
        </Field>
        <div className="flex items-start gap-2">
          <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
          <label htmlFor="agree" className="text-sm leading-snug">
            קראתי ואני מסכים/ה ל<Link to="/terms" target="_blank" className="text-primary hover:underline">תנאי השימוש</Link> ול<Link to="/privacy" target="_blank" className="text-primary hover:underline">מדיניות הפרטיות</Link>
          </label>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "יוצר חשבון…" : "יצירת חשבון"}</Button>
      </form>
    </AuthShell>
  );
}
