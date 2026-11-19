import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import PageLoader from "@/components/PageLoader";
import LogoMark from "@/components/LogoMark";
import ProfileForm, { focusFirstError, formToProfile, profileErrors, profileToForm } from "@/components/ProfileForm";
import { supabase, unwrap } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { APP_NAME } from "@/lib/config";
import { errorMessage } from "@/lib/utils";
import { safeNext } from "@/auth/guards";
import { usePageTitle } from "@/lib/usePageTitle";
import { tr } from "@/lib/i18n";

// Two short steps; the CV, bio and links wait for the profile page, once people have seen the site.
const STEPS = [
  { title: tr("ברוכים הבאים ל-{0}!", APP_NAME), text: tr("נתחיל מהבסיס: איך יכירו אתכם"), sections: ["basics"] },
  { title: tr("המוזיקה שלכם"), text: tr("בחרו כלי או תפקיד, ועד 3 ז'אנרים. את השאר אפשר להוסיף אחר כך בפרופיל."), sections: ["music"] },
];

// Keeps what was filled if the page reloads (common on phones when switching apps).
const draftKey = (id) => `onboarding-draft:${id}`;
const readDraft = (id) => {
  try { return JSON.parse(sessionStorage.getItem(draftKey(id))); } catch { return null; }
};

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  usePageTitle(tr("בניית פרופיל"));
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [checked, setChecked] = useState(false); // show field errors only after the first try
  const [taken, setTaken] = useState(null); // a username the server said is already in use

  useEffect(() => {
    if (!profile || form) return;
    const draft = readDraft(user.id);
    setForm(draft?.form ?? profileToForm(profile));
    if (draft?.step) setStep(Math.min(draft.step, STEPS.length - 1));
  }, [profile, form, user.id]);
  useEffect(() => {
    if (form) sessionStorage.setItem(draftKey(user.id), JSON.stringify({ form, step }));
  }, [form, step, user.id]);
  useEffect(() => { if (profile?.onboarding_completed) navigate(safeNext("/feed"), { replace: true }); }, [profile, navigate]);
  if (!form) return <PageLoader />;

  const errors = checked ? profileErrors(form) : {};
  if (taken && form.username.trim().toLowerCase() === taken) errors.username = tr("שם המשתמש כבר תפוס. נסו שם אחר");
  const basicsInvalid = () => {
    const errs = profileErrors(form);
    if (!Object.keys(errs).length) return false;
    setChecked(true);
    setStep(0);
    focusFirstError(errs);
    return true;
  };

  const finish = async () => {
    if (basicsInvalid()) return;
    setSaving(true);
    try {
      unwrap(await supabase.from("profiles").update({ ...formToProfile(form), onboarding_completed: true }).eq("id", user.id));
      sessionStorage.removeItem(draftKey(user.id));
      await refreshProfile();
      toast.success(tr("הפרופיל מוכן!"));
      navigate(safeNext("/feed"), { replace: true });
    } catch (e) {
      if (/username/i.test(e.message)) {
        setTaken(form.username.trim().toLowerCase());
        setStep(0);
        focusFirstError({ username: true });
      } else toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step === 0 && basicsInvalid()) return;
    if (step < STEPS.length - 1) return setStep(step + 1);
    return finish();
  };

  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <div className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2"><LogoMark className="h-8 w-8" /><span className="ltr text-[1.2rem] font-extrabold tracking-tight">Music<span className="text-primary">Hub</span></span></div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="mb-6 h-1.5" aria-label={tr("שלב {0} מתוך {1}", step + 1, STEPS.length)} />
        <Card className="p-6 sm:p-8">
          <p className="text-sm font-medium text-primary">{tr("שלב")}{" "}{step + 1}{" "}{tr("מתוך")}{" "}{STEPS.length}</p>
          <h1 className="mt-1 text-balance text-[1.75rem] font-bold leading-tight tracking-tight">{s.title}</h1>
          <p className="mb-6 mt-2 text-pretty text-muted-foreground">{s.text}</p>
          <ProfileForm form={form} setForm={setForm} userId={user.id} sections={s.sections} compact errors={errors} />
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={saving}>{tr("חזרה")}</Button>}
            <Button variant="ghost" className="ms-auto text-muted-foreground" onClick={finish} disabled={saving}>{tr("אדלג בינתיים")}</Button>
            <Button onClick={next} disabled={saving}>{last ? (saving ? tr("שומרים…") : tr("סיום")) : tr("המשך")}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
