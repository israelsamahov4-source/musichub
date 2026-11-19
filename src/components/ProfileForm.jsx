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
import { GENRES, INSTRUMENTS, LEVELS, LOOKING_FOR, ROLES } from "@/lib/config";
import { errorMessage, safeUrl } from "@/lib/utils";

export const LINK_FIELDS = [
  { key: "website", label: "אתר אישי" },
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
    links,
  };
}

/** Problems per field, e.g. { username: "..." }; empty when the basics are valid. */
export function profileErrors(f) {
  const errors = {};
  if (f.full_name.trim().length < 2) errors.full_name = "נא לכתוב שם מלא (לפחות 2 תווים)";
  const u = f.username.trim().toLowerCase();
  if (u.length < 3 || u.length > 30) errors.username = "שם המשתמש צריך להיות באורך 3 עד 30 תווים";
  else if (!/^[a-z0-9_]+$/.test(u)) errors.username = "רק אותיות באנגלית קטנות, ספרות או _ (בלי רווחים ועברית)";
  return errors;
}

export function validateProfile(f) {
  return Object.values(profileErrors(f))[0] ?? null;
}

/** Moves keyboard focus to the first field with a problem. */
export function focusFirstError(errors) {
  const first = ["full_name", "username"].find((k) => errors[k]);
  if (first) requestAnimationFrame(() => document.getElementById(first)?.focus());
}

// The first options a newcomer sees; the rest wait behind a "more" chip during onboarding.
const POPULAR = {
  instruments: ["vocals", "guitar", "bass", "drums", "piano", "synth", "oud", "dj"],
  roles: ["vocalist", "instrumentalist", "producer", "songwriter", "composer", "sound_engineer"],
  genres: ["pop", "rock", "hiphop", "mizrahi", "israeli", "electronic", "jazz", "indie"],
};

/** `compact` is the onboarding version: no cover photo, no level, short option lists and up to 3 genres. */
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
              {uploading === "avatar_url" ? <Loader2 className="animate-spin" /> : <Camera />}תמונת פרופיל
            </Button>
          </div>
          {!compact && <div className="space-y-2">
            <div className="relative h-24 overflow-hidden rounded-xl border-2 border-ink/15 bg-riso-blue">
              {safeUrl(form.cover_url)
                ? <img src={safeUrl(form.cover_url)} alt="" className="h-full w-full object-cover" />
                : <p className="flex h-full items-center justify-center px-4 text-center text-sm text-white/85">בלי תמונת כיסוי, הכיסוי יורכב מהכלים והתפקידים שלכם</p>}
            </div>
            <input ref={coverRef} type="file" accept={ACCEPT.image} hidden onChange={onImage("cover_url")} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => coverRef.current?.click()} disabled={!!uploading}>
                {uploading === "cover_url" ? <Loader2 className="animate-spin" /> : <ImageIcon />}תמונת כיסוי
              </Button>
              {form.cover_url && <Button type="button" variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, cover_url: null }))}>הסרה</Button>}
            </div>
          </div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="full_name" label="שם מלא" error={errors.full_name}>
              <Input id="full_name" value={form.full_name} onChange={set("full_name")} maxLength={80} required />
            </Field>
            <Field id="username" label="שם משתמש" error={errors.username} hint="אותיות באנגלית קטנות, ספרות או _. יופיע בכתובת הפרופיל שלכם">
              <Input id="username" dir="ltr" value={form.username} onChange={(e) => set("username")(e.target.value.toLowerCase())} maxLength={30} required />
            </Field>
            <Field id="location" label="עיר">
              <CityPicker id="location" value={form.location} onChange={set("location")} />
            </Field>
            <Field id="user_type" label="אני…">
              <Select value={form.user_type} onValueChange={set("user_type")} dir="rtl">
                <SelectTrigger id="user_type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="musician">מוזיקאי/ת</SelectItem>
                  <SelectItem value="listener">חובב/ת מוזיקה</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>
      )}

      {show("music") && (
        <section className="space-y-4">
          <Field label="כלי נגינה"><TagPicker options={INSTRUMENTS} value={form.instruments} onChange={set("instruments")} max={10} label="כלי נגינה" popular={compact ? POPULAR.instruments : undefined} /></Field>
          <Field label="תפקידים"><TagPicker options={ROLES} value={form.roles} onChange={set("roles")} max={6} label="תפקידים" popular={compact ? POPULAR.roles : undefined} /></Field>
          {!compact && <Field id="level" label="רמה מוזיקלית">
            <Select value={form.level} onValueChange={set("level")} dir="rtl">
              <SelectTrigger id="level" className="sm:w-60"><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>}
          <Field label={compact ? "ז'אנרים (עד 3)" : "ז'אנרים"}><TagPicker options={GENRES} value={form.genres} onChange={set("genres")} max={compact ? 3 : 8} label="ז'אנרים" popular={compact ? POPULAR.genres : undefined} /></Field>
        </section>
      )}

      {show("about") && (
        <section className="space-y-4">
          <Field label="מה אני מחפש/ת" hint="מה שתסמנו יופיע בפרופיל, ויעזור לאנשים שמחפשים בדיוק אתכם למצוא אתכם.">
            <TagPicker options={LOOKING_FOR} value={form.looking_for} onChange={set("looking_for")} label="מה אני מחפש/ת" />
          </Field>
          <Field id="bio" label="קצת עליי" hint={`${form.bio.length}/1000`}>
            <Textarea id="bio" value={form.bio} onChange={set("bio")} maxLength={1000} rows={4} placeholder="השפעות, ניסיון, על מה אתם עובדים עכשיו…" />
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
