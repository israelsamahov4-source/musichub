import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageLoader from "@/components/PageLoader";
import ProfileForm, { formToProfile, profileToForm, validateProfile } from "@/components/ProfileForm";
import CvEditor, { EMPTY_CV, cvToRow } from "@/components/CvEditor";
import { fetchDetails } from "@/api/details";
import { supabase, unwrap } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { errorMessage } from "@/lib/utils";

export default function ProfileEdit() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [cv, setCv] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (profile && !form) setForm(profileToForm(profile)); }, [profile, form]);
  useEffect(() => {
    if (!user || cv) return;
    fetchDetails(user.id).then((d) => setCv({ ...EMPTY_CV, ...(d || {}), years_experience: d?.years_experience ?? "" }))
      .catch(() => setCv(EMPTY_CV));
  }, [user, cv]);
  if (!form || !cv) return <PageLoader />;

  const save = async (e) => {
    e.preventDefault();
    const err = validateProfile(form);
    if (err) return toast.error(err);
    setSaving(true);
    try {
      const values = formToProfile(form);
      unwrap(await supabase.from("profiles").update(values).eq("id", user.id));
      unwrap(await supabase.from("profile_details").update(cvToRow(cv)).eq("user_id", user.id));
      await refreshProfile();
      toast.success("הפרופיל נשמר");
      navigate(`/u/${values.username}`);
    } catch (e2) {
      toast.error(errorMessage(e2));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="page-narrow space-y-6" onSubmit={save}>
      <h1 className="page-title">עריכת פרופיל</h1>
      <Card className="p-5"><h2 className="mb-4 font-semibold">פרטים בסיסיים</h2><ProfileForm form={form} setForm={setForm} userId={user.id} sections={["basics"]} /></Card>
      <Card className="p-5"><h2 className="mb-4 font-semibold">מוזיקה</h2><ProfileForm form={form} setForm={setForm} userId={user.id} sections={["music"]} /></Card>
      <Card className="p-5"><h2 className="mb-4 font-semibold">עליי</h2><ProfileForm form={form} setForm={setForm} userId={user.id} sections={["about"]} /></Card>
      <Card className="p-5">
        <h2 className="font-display text-4xl font-bold">קורות חיים מוזיקליים</h2>
        <p className="mb-5 mt-1 text-sm text-muted-foreground">מה שמנהלי פרויקטים ולהקות יראו כשתפנו אליהם. אתם בוחרים מי רואה.</p>
        <CvEditor cv={cv} setCv={setCv} />
      </Card>
      <Card className="p-5"><h2 className="mb-4 font-semibold">קישורים</h2><ProfileForm form={form} setForm={setForm} userId={user.id} sections={["links"]} /></Card>
      <div className="sticky bottom-20 flex justify-end gap-2 md:bottom-4">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>ביטול</Button>
        <Button type="submit" disabled={saving}>{saving ? "שומר…" : "שמירה"}</Button>
      </div>
    </form>
  );
}
