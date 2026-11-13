import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import PageLoader from "@/components/PageLoader";
import ProfileForm, { formToProfile, profileToForm, validateProfile } from "@/components/ProfileForm";
import { supabase, unwrap } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { APP_NAME } from "@/lib/config";
import { errorMessage } from "@/lib/utils";

const STEPS = [
  { title: `ברוכים הבאים ל-${APP_NAME}!`, text: "נתחיל מהבסיס: איך יכירו אתכם", sections: ["basics"] },
  { title: "המוזיקה שלכם", text: "כך מוזיקאים אחרים ימצאו אתכם", sections: ["music"] },
  { title: "מה אתם מחפשים?", text: "נתאים לכם אנשים ופרויקטים", sections: ["about"] },
];

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (profile && !form) setForm(profileToForm(profile)); }, [profile, form]);
  useEffect(() => { if (profile?.onboarding_completed) navigate("/feed", { replace: true }); }, [profile, navigate]);
  if (!form) return <PageLoader />;

  const next = async () => {
    if (step === 0) {
      const err = validateProfile(form);
      if (err) return toast.error(err);
    }
    if (step < STEPS.length - 1) return setStep(step + 1);
    setSaving(true);
    try {
      unwrap(await supabase.from("profiles").update({ ...formToProfile(form), onboarding_completed: true }).eq("id", user.id));
      await refreshProfile();
      toast.success("הפרופיל מוכן!");
      navigate("/feed", { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
      if (/username/i.test(e.message)) setStep(0);
    } finally {
      setSaving(false);
    }
  };

  const s = STEPS[step];
  return (
    <div className="grain min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Progress value={((step + 1) / STEPS.length) * 100} className="mb-6 h-1.5" aria-label={`שלב ${step + 1} מתוך ${STEPS.length}`} />
        <Card className="p-6 sm:p-8">
          <p className="text-sm text-muted-foreground">שלב {step + 1} מתוך {STEPS.length}</p>
          <h1 className="mt-1 font-display text-5xl font-bold leading-[0.95]">{s.title}</h1>
          <p className="mb-6 text-muted-foreground">{s.text}</p>
          <ProfileForm form={form} setForm={setForm} userId={user.id} sections={s.sections} />
          <div className="mt-8 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>חזרה</Button>
            <Button onClick={next} disabled={saving}>{step === STEPS.length - 1 ? (saving ? "שומר…" : "סיום") : "המשך"}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
