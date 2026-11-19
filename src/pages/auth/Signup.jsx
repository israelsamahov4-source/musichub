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
import { safeNext } from "@/auth/guards";
import { PENDING_NEXT_KEY, useAuthHref } from "@/auth/returnTo";
import { errorMessage } from "@/lib/utils";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState(null);
  const [checked, setChecked] = useState(false); // show field errors only after the first try
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const loginHref = useAuthHref("/login");
  const next = safeNext(null);
  const onboarding = next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding";

  const problems = {};
  if (form.fullName.trim().length < 2) problems.fullName = "נא לכתוב שם מלא";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) problems.email = "כתובת האימייל לא נראית תקינה. בדקו שיש בה @ ונקודה";
  if (form.password.length < 8) problems.password = form.password ? `הסיסמה קצרה מדי: ${form.password.length} מתוך 8 תווים לפחות` : "נא לבחור סיסמה של 8 תווים לפחות";
  if (!agree) problems.agree = "כדי להמשיך צריך לאשר את תנאי השימוש ומדיניות הפרטיות";
  const errors = checked ? problems : {};

  const submit = async (e) => {
    e.preventDefault();
    const first = ["fullName", "email", "password", "agree"].find((k) => problems[k]);
    if (first) {
      setChecked(true);
      return document.getElementById(first)?.focus();
    }
    setBusy(true);
    // Remember where the visitor came from, so the e-mail link brings them back after onboarding.
    try { if (next) localStorage.setItem(PENDING_NEXT_KEY, next); } catch { /* private mode */ }
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { full_name: form.fullName.trim().slice(0, 80) },
        emailRedirectTo: `${window.location.origin}${onboarding}`,
      },
    });
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    if (data.session) navigate(onboarding, { replace: true });
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
    <AuthShell title="הצטרפות" subtitle="יוצרים פרופיל ומתחילים להתחבר למוזיקאים" footer={<>כבר יש לכם חשבון? <Link to={loginHref} className="font-medium font-semibold text-primary hover:underline">התחברות</Link></>}>
      <GoogleButton />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field id="fullName" label="שם מלא" error={errors.fullName}>
          <Input id="fullName" autoComplete="name" required maxLength={80} value={form.fullName} onChange={set("fullName")} />
        </Field>
        <Field id="email" label="אימייל" error={errors.email}>
          <Input id="email" type="email" dir="ltr" autoComplete="email" required value={form.email} onChange={set("email")} />
        </Field>
        <Field id="password" label="סיסמה" hint="לפחות 8 תווים" error={errors.password}>
          <Input id="password" type="password" dir="ltr" autoComplete="new-password" required minLength={8} value={form.password} onChange={set("password")} />
        </Field>
        <div className="flex items-start gap-2">
          <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5"
            aria-invalid={errors.agree ? true : undefined} aria-describedby={errors.agree ? "agree-error" : undefined} />
          <label htmlFor="agree" className="text-sm leading-snug">
            קראתי ואני מסכים/ה ל<Link to="/terms" target="_blank" className="font-semibold text-primary hover:underline">תנאי השימוש</Link> ול<Link to="/privacy" target="_blank" className="font-semibold text-primary hover:underline">מדיניות הפרטיות</Link>
          </label>
        </div>
        {errors.agree && <p id="agree-error" role="alert" className="-mt-2 text-xs font-medium text-destructive">{errors.agree}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "יוצרים חשבון…" : "יצירת חשבון"}</Button>
      </form>
    </AuthShell>
  );
}
