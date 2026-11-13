import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Field from "@/components/Field";
import TagPicker from "@/components/TagPicker";
import { OPEN_TO, VISIBILITY } from "@/lib/config";
import { cn, normalizeUrl, safeUrl } from "@/lib/utils";

export const EMPTY_CV = {
  visibility: "members", headline: "", open_to: [], years_experience: "",
  skills: [], languages: [], experience: [], education: [], portfolio: [],
};

const year = (v) => (v === "" || v == null ? null : Math.max(1950, Math.min(2100, Number(v) || 0)) || null);

/** Cleans the form into the shape stored in profile_details. */
export function cvToRow(cv) {
  return {
    visibility: cv.visibility,
    headline: cv.headline.trim(),
    open_to: cv.open_to,
    years_experience: cv.years_experience === "" || cv.years_experience == null ? null : Math.max(0, Math.min(80, Number(cv.years_experience))),
    skills: cv.skills,
    languages: cv.languages,
    experience: cv.experience.filter((e) => e.title?.trim()).map((e) => ({
      title: e.title.trim().slice(0, 100), org: (e.org || "").trim().slice(0, 100),
      start_year: year(e.start_year), end_year: year(e.end_year), description: (e.description || "").trim().slice(0, 600),
    })),
    education: cv.education.filter((e) => e.school?.trim()).map((e) => ({
      school: e.school.trim().slice(0, 100), program: (e.program || "").trim().slice(0, 100),
      start_year: year(e.start_year), end_year: year(e.end_year),
    })),
    portfolio: cv.portfolio.map((p) => ({ title: (p.title || "").trim().slice(0, 100), url: safeUrl(normalizeUrl(p.url)) }))
      .filter((p) => p.url),
  };
}

function FreeTags({ value, onChange, placeholder, max = 30, label }) {
  const [text, setText] = useState("");
  const add = () => {
    const t = text.trim().slice(0, 40);
    if (t && !value.includes(t) && value.length < max) onChange([...value, t]);
    setText("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`הסרת ${t}`}><X className="h-3.5 w-3.5" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={label}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} />
        <Button type="button" variant="secondary" onClick={add}>הוספה</Button>
      </div>
    </div>
  );
}

function ListEditor({ items, onChange, empty, fields, addLabel, max }) {
  const update = (i, k, v) => onChange(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="relative rounded-xl border border-ink/10 bg-muted/40 p-4 pe-12">
          <Button type="button" size="icon" variant="ghost" className="absolute end-2 top-2 h-8 w-8" aria-label="הסרה"
            onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 /></Button>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={cn(f.wide && "sm:col-span-2")}>
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor={`${f.key}-${i}`}>{f.label}</label>
                {f.multiline ? (
                  <Textarea id={`${f.key}-${i}`} rows={2} maxLength={600} value={it[f.key] ?? ""} onChange={(e) => update(i, f.key, e.target.value)} />
                ) : (
                  <Input id={`${f.key}-${i}`} type={f.type || "text"} dir={f.ltr ? "ltr" : undefined} placeholder={f.placeholder}
                    value={it[f.key] ?? ""} onChange={(e) => update(i, f.key, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {items.length < max && (
        <Button type="button" variant="outline" onClick={() => onChange([...items, { ...empty }])}><Plus />{addLabel}</Button>
      )}
    </div>
  );
}

/** Editable musical CV. `sections` lets onboarding show only the essentials. */
export default function CvEditor({ cv, setCv, sections = ["basics", "visibility", "experience", "education", "skills", "portfolio"] }) {
  const set = (k) => (v) => setCv((c) => ({ ...c, [k]: v?.target ? v.target.value : v }));
  const show = (s) => sections.includes(s);
  return (
    <div className="space-y-7">
      {show("basics") && (
        <div className="space-y-4">
          <Field id="headline" label="כותרת מקצועית" hint="שורה אחת שמסבירה מי אתם. לדוגמה: בסיסט ומפיק, מנגן ג'אז ופאנק כבר 10 שנים">
            <Input id="headline" value={cv.headline} onChange={set("headline")} maxLength={120} />
          </Field>
          <Field label="פתוח/ה ל…"><TagPicker options={OPEN_TO} value={cv.open_to} onChange={set("open_to")} label="פתוח/ה ל" /></Field>
          <Field id="years" label="שנות ניסיון במוזיקה">
            <Input id="years" type="number" min={0} max={80} value={cv.years_experience ?? ""} onChange={set("years_experience")} className="w-28" />
          </Field>
        </div>
      )}

      {show("visibility") && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">מי יכול לראות את קורות החיים?</legend>
          {VISIBILITY.map((v) => (
            <label key={v.value} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
              cv.visibility === v.value ? "border-primary bg-secondary" : "border-ink/10 hover:bg-muted")}>
              <input type="radio" name="visibility" value={v.value} checked={cv.visibility === v.value} onChange={() => set("visibility")(v.value)} className="mt-1 accent-[#2F45C2]" />
              <span><span className="block font-medium">{v.label}</span><span className="text-sm text-muted-foreground">{v.text}</span></span>
            </label>
          ))}
          <p className="text-xs text-muted-foreground">השם, התמונה, הכלים והז'אנרים שלכם תמיד גלויים, כדי שיוכלו למצוא אתכם.</p>
        </fieldset>
      )}

      {show("experience") && (
        <Field label="ניסיון: להקות, פרויקטים, תפקידים">
          <ListEditor items={cv.experience} onChange={set("experience")} max={30} addLabel="הוספת ניסיון"
            empty={{ title: "", org: "", start_year: "", end_year: "", description: "" }}
            fields={[
              { key: "title", label: "תפקיד", placeholder: "גיטריסט, מפיקה, מעבד…" },
              { key: "org", label: "להקה / פרויקט / מקום", placeholder: "שם הלהקה או האולפן" },
              { key: "start_year", label: "משנה", type: "number" },
              { key: "end_year", label: "עד שנה (ריק = עד היום)", type: "number" },
              { key: "description", label: "מה עשיתם", multiline: true, wide: true },
            ]} />
        </Field>
      )}

      {show("education") && (
        <Field label="לימודים והכשרה">
          <ListEditor items={cv.education} onChange={set("education")} max={10} addLabel="הוספת לימודים"
            empty={{ school: "", program: "", start_year: "", end_year: "" }}
            fields={[
              { key: "school", label: "מוסד / מורה", placeholder: "רימון, אקדמיה, מורה פרטי…" },
              { key: "program", label: "מסלול / תחום" },
              { key: "start_year", label: "משנה", type: "number" },
              { key: "end_year", label: "עד שנה", type: "number" },
            ]} />
        </Field>
      )}

      {show("skills") && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="כישורים"><FreeTags value={cv.skills} onChange={set("skills")} placeholder="קריאת תווים, Ableton, הרמוניה…" label="כישור חדש" /></Field>
          <Field label="שפות"><FreeTags value={cv.languages} onChange={set("languages")} max={10} placeholder="עברית, English…" label="שפה חדשה" /></Field>
        </div>
      )}

      {show("portfolio") && (
        <Field label="תיק עבודות" hint="קישורים ל-YouTube, Vimeo, Spotify, SoundCloud או כל אתר אחר. סרטונים ינוגנו ישירות בפרופיל.">
          <ListEditor items={cv.portfolio} onChange={set("portfolio")} max={12} addLabel="הוספת עבודה"
            empty={{ title: "", url: "" }}
            fields={[
              { key: "title", label: "שם העבודה", placeholder: "הופעה חיה בבארבי" },
              { key: "url", label: "קישור", ltr: true, placeholder: "https://" },
            ]} />
        </Field>
      )}
    </div>
  );
}
