import { ExternalLink, Lock } from "lucide-react";
import MediaView from "@/components/MediaView";
import { label } from "@/lib/config";
import { safeUrl, videoEmbedUrl } from "@/lib/utils";

const years = (a, b) => (a ? `${a}–${b || "היום"}` : b ? `עד ${b}` : "");

export function OpenToBadges({ openTo }) {
  if (!openTo?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {openTo.map((o) => (
        <span key={o} className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">{label("openTo", o)}</span>
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
        <span>{hiddenText ?? "קורות החיים המוזיקליים גלויים רק לאנשים שהמשתמש/ת בחר/ה."}</span>
      </div>
    );
  }
  const experience = compact ? cv.experience?.slice(0, 3) : cv.experience;
  const empty = !cv.headline && !cv.experience?.length && !cv.education?.length && !cv.skills?.length && !cv.portfolio?.length;
  if (empty && compact) return null;
  if (empty) return <p className="text-sm text-muted-foreground">עוד לא מילאו כאן קורות חיים.</p>;

  return (
    <div className="space-y-6">
      {experience?.length > 0 && (
        <section>
          {!compact && <h3 className="mb-3 font-display text-3xl font-bold">ניסיון</h3>}
          <ol className="relative space-y-4 border-s-2 border-riso-blue/25 ps-5">
            {experience.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -start-[1.6rem] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-riso-pink" aria-hidden />
                <p className="font-semibold">{e.title}{e.org && <span className="font-normal text-muted-foreground"> ב{e.org}</span>}</p>
                {years(e.start_year, e.end_year) && <p className="ltr w-fit text-xs text-muted-foreground">{years(e.start_year, e.end_year)}</p>}
                {!compact && e.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{e.description}</p>}
              </li>
            ))}
          </ol>
          {compact && cv.experience.length > 3 && <p className="mt-2 text-xs text-muted-foreground">ועוד {cv.experience.length - 3} בפרופיל</p>}
        </section>
      )}

      {!compact && cv.education?.length > 0 && (
        <section>
          <h3 className="mb-3 font-display text-3xl font-bold">לימודים</h3>
          <ul className="space-y-2">
            {cv.education.map((e, i) => (
              <li key={i}>
                <p className="font-semibold">{e.school}{e.program && <span className="font-normal text-muted-foreground">, {e.program}</span>}</p>
                {years(e.start_year, e.end_year) && <p className="ltr w-fit text-xs text-muted-foreground">{years(e.start_year, e.end_year)}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {cv.skills?.length > 0 && (
        <section>
          {!compact && <h3 className="mb-3 font-display text-3xl font-bold">כישורים</h3>}
          <div className="flex flex-wrap gap-1.5">{cv.skills.map((s) => <span key={s} className="chip">{s}</span>)}</div>
          {!compact && cv.languages?.length > 0 && <p className="mt-3 text-sm text-muted-foreground">שפות: {cv.languages.join(", ")}</p>}
        </section>
      )}

      {!compact && cv.portfolio?.length > 0 && (
        <section>
          <h3 className="mb-3 font-display text-3xl font-bold">תיק עבודות</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {cv.portfolio.map((p, i) => (
              <figure key={i} className="space-y-2">
                {videoEmbedUrl(p.url) ? <MediaView url={p.url} type="video" title={p.title} /> : (
                  <a href={safeUrl(p.url)} target="_blank" rel="noopener noreferrer nofollow"
                    className="flex items-center gap-2 rounded-xl border border-ink/10 bg-muted/40 p-4 font-medium hover:bg-muted">
                    <ExternalLink className="h-4 w-4 text-primary" aria-hidden />{p.title || new URL(p.url).hostname}
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
