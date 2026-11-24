import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/Field";
import TagPicker from "@/components/TagPicker";
import CityPicker from "@/components/CityPicker";
import UserAvatar from "@/components/UserAvatar";
import { ACCEPT, uploadFile } from "@/lib/upload";
import { GENRES, INSTRUMENTS, LEVELS, LOOKING_FOR, MAX_INSTITUTION, ROLES, USER_TYPES } from "@/lib/config";
import { cn, errorMessage, safeUrl } from "@/lib/utils";
import { DIR, tr } from "@/lib/i18n";

export const LINK_FIELDS = [
  { key: "website", label: tr("אתר אישי") },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "spotify", label: "Spotify" },
  { key: "soundcloud", label: "SoundCloud" },
];

/** Converts a profile row into editable form state. */
export function profileToForm(p) {
  return {
    full_name: p.full_name || "",
    username: p.username || "",
    avatar_url: p.avatar_url || null,
    cover_url: p.cover_url || null,
    bio: p.bio || "",
    location: p.location || "",
    user_type: p.user_type || "musician",
    instruments: p.instruments || [],
    roles: (Array.isArray(p.musical_roles) ? p.musical_roles : []).map((r) => r?.role).filter((r) => typeof r === "string"),
    level: p.musical_roles?.[0]?.level || "intermediate",
    genres: p.genres || [],
    looking_for: p.looking_for || [],
    institution: p.institution || "",
    links: { ...(p.links || {}) },
  };
}

/** Converts form state back into the columns the user is allowed to update. */
export function formToProfile(f) {
  const links = Object.fromEntries(
    Object.entries(f.links).map(([k, v]) => [k, (v || "").trim()]).filter(([, v]) => v)
      .map(([k, v]) => [k, /^https?:\/\//i.test(v) ? v : `https://${v}`]),
  );
  return {
    full_name: f.full_name.trim(),
    username: f.username.trim().toLowerCase(),
    avatar_url: f.avatar_url,
    cover_url: f.cover_url ?? null,
    bio: f.bio.trim(),
    location: f.location.trim(),
    user_type: f.user_type,
    instruments: f.instruments,
    musical_roles: f.roles.map((role) => ({ role, level: f.level })),
    genres: f.genres,
    looking_for: f.looking_for,
    // Kept in step with the list: whoever picked something is open to working together.
    open_for_collaboration: f.looking_for.length > 0,
    // Only students say where they study. Track and year are no longer asked, so they are cleared.
    institution: f.user_type === "student" ? f.institution.trim() || null : null,
    study_track: null,
    study_year: null,
    links,
  };
}

/** Problems per field, e.g. { username: "..." }; empty when the basics are valid. */
export function profileErrors(f) {
  const errors = {};
  if (f.full_name.trim().length < 2) errors.full_name = tr("נא לכתוב שם מלא (לפחות 2 תווים)");
  const u = f.username.trim().toLowerCase();
  if (u.length < 3 || u.length > 30) errors.username = tr("שם המשתמש צריך להיות באורך 3 עד 30 תווים");
  else if (!/^[a-z0-9_]+$/.test(u)) errors.username = tr("רק אותיות באנגלית קטנות, ספרות או _ (בלי רווחים ועברית)");
  if (f.user_type === "student" && f.institution.trim().length === 1) errors.institution = tr("נא לכתוב את שם מקום הלימודים המלא");
  return errors;
}

export function validateProfile(f) {
  return Object.values(profileErrors(f))[0] ?? null;
}

/** Moves keyboard focus to the first field with a problem. */
export function focusFirstError(errors) {
  const first = ["full_name", "username", "institution"].find((k) => errors[k]);
  if (first) requestAnimationFrame(() => document.getElementById(first)?.focus());
}

// The first options a newcomer sees; the rest wait behind a "more" chip during onboarding.
const POPULAR = {
  instruments: ["vocals", "guitar", "bass", "drums", "piano", "synth", "oud", "dj"],
  roles: ["vocalist", "instrumentalist", "producer", "songwriter", "composer", "sound_engineer"],
  genres: ["pop", "rock", "hiphop", "mizrahi", "israeli", "electronic", "jazz", "indie"],
};

/** "What describes you best?" (one choice). Students can also write where they study, in their own words. */
function WhoFields({ form, set, errors }) {
  return (
    <section className="space-y-4">
      <Field label={tr("מה מתאר אותך הכי טוב?")}>
        <div className="flex flex-wrap gap-2" role="group" aria-label={tr("מה מתאר אותך הכי טוב?")}>
          {USER_TYPES.map((o) => {
            const on = form.user_type === o.value;
            return (
              <button key={o.value} type="button" aria-pressed={on} onClick={() => set("user_type")(o.value)}
                className={cn("inline-flex min-h-9 items-center rounded-full border px-3.5 py-1 text-sm transition-colors",
                  on ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent")}>
                {o.label}
              </button>
            );
          })}
        </div>
      </Field>
      {form.user_type === "student" && (
        <Field id="institution" label={tr("איפה אני לומד/ת")} error={errors.institution}
          hint={tr("לא חובה. כך סטודנטים מאותו מקום ומחוצה לו ימצאו אתכם.")}>
          <Input id="institution" value={form.institution} onChange={set("institution")} maxLength={MAX_INSTITUTION}
            placeholder={tr("למשל: רימון, הקריה האקדמית אונו")} className="sm:w-96" />
        </Field>
      )}
    </section>
  );
}

/** `compact` is the onboarding version: no cover photo, no level, and short option lists behind a "more" chip. */
export default function ProfileForm({ form, setForm, userId, sections = ["basics", "music", "about", "links"], compact = false, errors = {} }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));
  const show = (s) => sections.includes(s);

  const coverRef = useRef(null);
  const onImage = (field) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(field);
    try {
      const url = await uploadFile(file, { bucket: "avatars", kind: "image", userId });
      setForm((f) => ({ ...f, [field]: url }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {show("basics") && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <UserAvatar profile={{ ...form }} size="xl" />
            <input ref={fileRef} type="file" accept={ACCEPT.image} hidden onChange={onImage("avatar_url")} />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={!!uploading}>
              {uploading === "avatar_url" ? <Loader2 className="animate-spin" /> : <Camera />}{tr("תמונת פרופיל")}
            </Button>
          </div>
          {!compact && <div className="space-y-2">
            <div className="relative h-24 overflow-hidden rounded-xl bg-riso-blue">
              {safeUrl(form.cover_url)
                ? <img src={safeUrl(form.cover_url)} alt="" className="h-full w-full object-cover" />
                : <p className="flex h-full items-center justify-center px-4 text-center text-sm text-white/85">{tr("בלי תמונת כיסוי יופיע כיסוי הגלים של Jamly")}</p>}
            </div>
            <input ref={coverRef} type="file" accept={ACCEPT.image} hidden onChange={onImage("cover_url")} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => coverRef.current?.click()} disabled={!!uploading}>
                {uploading === "cover_url" ? <Loader2 className="animate-spin" /> : <ImageIcon />}{tr("תמונת כיסוי")}
              </Button>
              {form.cover_url && <Button type="button" variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, cover_url: null }))}>{tr("הסרה")}</Button>}
            </div>
          </div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="full_name" label={tr("שם מלא")} error={errors.full_name}>
              <Input id="full_name" value={form.full_name} onChange={set("full_name")} maxLength={80} required />
            </Field>
            <Field id="username" label={tr("שם משתמש")} error={errors.username} hint={tr("אותיות באנגלית קטנות, ספרות או _. יופיע בכתובת הפרופיל שלכם")}>
              <Input id="username" dir="ltr" value={form.username} onChange={(e) => set("username")(e.target.value.toLowerCase())} maxLength={30} required />
            </Field>
            <Field id="location" label={tr("עיר")}>
              <CityPicker id="location" value={form.location} onChange={set("location")} />
            </Field>
          </div>
        </section>
      )}

      {show("who") && <WhoFields form={form} set={set} errors={errors} />}

      {show("music") && (
        <section className="space-y-4">
          <Field label={tr("כלי נגינה")}><TagPicker options={INSTRUMENTS} value={form.instruments} onChange={set("instruments")} max={10} label={tr("כלי נגינה")} popular={compact ? POPULAR.instruments : undefined} /></Field>
          <Field label={tr("תפקידים")}><TagPicker options={ROLES} value={form.roles} onChange={set("roles")} max={6} label={tr("תפקידים")} popular={compact ? POPULAR.roles : undefined} /></Field>
          {!compact && <Field id="level" label={tr("רמה מוזיקלית")}>
            <Select value={form.level} onValueChange={set("level")} dir={DIR}>
              <SelectTrigger id="level" className="sm:w-60"><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>}
          <Field label={tr("ז'אנרים")}><TagPicker options={GENRES} value={form.genres} onChange={set("genres")} label={tr("ז'אנרים")} popular={compact ? POPULAR.genres : undefined} /></Field>
        </section>
      )}

      {show("about") && (
        <section className="space-y-4">
          <Field label={tr("מה אני מחפש/ת")} hint={tr("מה שתסמנו יופיע בפרופיל, ויעזור לאנשים שמחפשים בדיוק אתכם למצוא אתכם.")}>
            <TagPicker options={LOOKING_FOR} value={form.looking_for} onChange={set("looking_for")} label={tr("מה אני מחפש/ת")} />
          </Field>
          <Field id="bio" label={tr("קצת עליי")} hint={`${form.bio.length}/1000`}>
            <Textarea id="bio" value={form.bio} onChange={set("bio")} maxLength={1000} rows={4} placeholder={tr("השפעות, ניסיון, על מה אתם עובדים עכשיו…")} />
          </Field>
        </section>
      )}

      {show("links") && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {LINK_FIELDS.map((l) => (
            <Field key={l.key} id={`link-${l.key}`} label={l.label}>
              <Input id={`link-${l.key}`} dir="ltr" value={form.links[l.key] || ""} maxLength={300} placeholder="https://"
                onChange={(e) => setForm((f) => ({ ...f, links: { ...f.links, [l.key]: e.target.value } }))} />
            </Field>
          ))}
        </section>
      )}
    </div>
  );
}
