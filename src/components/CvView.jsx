import { ExternalLink, GraduationCap, Lock, Mic2 } from "lucide-react";
import MediaView from "@/components/MediaView";
import { label } from "@/lib/config";
import { safeUrl, videoEmbedUrl, textDir } from "@/lib/utils";
import { tr } from "@/lib/i18n";

const hostOf = (url) => { try { return new URL(url).hostname; } catch { return url || tr("קישור"); } };

const years = (a, b) => (a ? `${a}–${b || tr("היום")}` : b ? tr("עד {0}", b) : "");

/** What someone is looking for (profiles.looking_for), as yellow stickers. */
export function LookingForBadges({ items }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((o) => (
        <span key={o} className="inline-flex items-center rounded-full bg-[#FFE3EB] px-2.5 py-0.5 text-xs font-semibold text-[#8E1840]">{label("lookingFor", o)}</span>
      ))}
    </div>
  );
}

/** Read-only musical CV. `compact` shows a short version for join requests. */
export default function CvView({ cv, compact = false, hiddenText }) {
  if (!cv) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{hiddenText ?? tr("קורות החיים המוזיקליים גלויים רק לאנשים שהמשתמש/ת בחר/ה.")}</span>
      </div>
    );
  }
  const experience = compact ? cv.experience?.slice(0, 3) : cv.experience;
  const empty = !cv.headline && !cv.experience?.length && !cv.education?.length && !cv.skills?.length && !cv.portfolio?.length;
  if (empty && compact) return null;
  if (empty) return <p className="text-sm text-muted-foreground">{tr("עוד לא מילאו כאן קורות חיים.")}</p>;

  return (
    <div className="space-y-6 [&>section+section]:border-t [&>section+section]:border-border/70 [&>section+section]:pt-6">
      {experience?.length > 0 && (
        <section>
          {!compact && <h3 className="mb-3 text-base font-bold">{tr("ניסיון")}</h3>}
          <ol className="space-y-4">
            {experience.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E5E9FB] text-primary" aria-hidden><Mic2 className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1 border-b border-border/70 pb-4 [li:last-child_&]:border-0 [li:last-child_&]:pb-0">
                  <p className="font-bold">{e.title}</p>
                  {e.org && <p className="text-sm">{e.org}</p>}
                  {years(e.start_year, e.end_year) && <p className="ltr w-fit text-[13px] text-muted-foreground">{years(e.start_year, e.end_year)}</p>}
                  {!compact && e.description && <p dir={textDir(e.description)} className="mt-1.5 whitespace-pre-wrap text-start text-sm leading-relaxed">{e.description}</p>}
                </div>
              </li>
            ))}
          </ol>
          {compact && cv.experience.length > 3 && <p className="mt-2 text-xs text-muted-foreground">{tr("ועוד")}{" "}{cv.experience.length - 3}{" "}{tr("בפרופיל")}</p>}
        </section>
      )}

      {!compact && cv.education?.length > 0 && (
        <section>
          <h3 className="mb-3 text-base font-bold">{tr("לימודים")}</h3>
          <ul className="space-y-4">
            {cv.education.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF2C2] text-[#6E5200]" aria-hidden><GraduationCap className="h-5 w-5" /></span>
                <div>
                  <p className="font-bold">{e.school}</p>
                  {e.program && <p className="text-sm">{e.program}</p>}
                  {years(e.start_year, e.end_year) && <p className="ltr w-fit text-[13px] text-muted-foreground">{years(e.start_year, e.end_year)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cv.skills?.length > 0 && (
        <section>
          {!compact && <h3 className="mb-3 text-base font-bold">{tr("כישורים")}</h3>}
          <div className="flex flex-wrap gap-1.5">{cv.skills.map((s) => <span key={s} className="chip">{s}</span>)}</div>
          {!compact && cv.languages?.length > 0 && <p className="mt-3 text-sm text-muted-foreground">{tr("שפות:")}{" "}{cv.languages.join(", ")}</p>}
        </section>
      )}

      {!compact && cv.portfolio?.length > 0 && (
        <section>
          <h3 className="mb-3 text-base font-bold">{tr("תיק עבודות")}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {cv.portfolio.map((p, i) => (
              <figure key={i} className="space-y-2">
                {videoEmbedUrl(p.url) ? <MediaView url={p.url} type="video" title={p.title} /> : (
                  <a href={safeUrl(p.url)} target="_blank" rel="noopener noreferrer nofollow"
                    className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 font-medium transition-colors hover:bg-muted">
                    <ExternalLink className="h-4 w-4 text-primary" aria-hidden />{p.title || hostOf(p.url)}
                  </a>
                )}
                {videoEmbedUrl(p.url) && p.title && <figcaption className="text-sm font-medium">{p.title}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
