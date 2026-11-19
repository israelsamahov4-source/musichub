import { Link } from "react-router-dom";
import { Check, GraduationCap, Handshake, Heart, MessageCircle, Play, Share2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME, GOOGLE_AUTH_ENABLED } from "@/lib/config";
import { usePageTitle } from "@/lib/usePageTitle";
import { tr } from "@/lib/i18n";

const LINEUP = [
  tr("גיטריסטים"), tr("זמרות"), tr("מתופפים"), tr("מפיקות"), tr("בסיסטים"), tr("כותבות שירים"),
  tr("קלידנים"), tr("נגני עוד"), "DJs", tr("מורות לנגינה"), tr("סאונדמנים"), tr("מעבדות"), tr("כנרים"), tr("ראפרים"),
];

const SIDES = [
  {
    side: "A",
    title: tr("יוצרים ביחד"),
    text: tr("פותחים פרויקט לשיר, לאלבום או ללהקה, כותבים את מי מחפשים, ומנהלים את העבודה באותו מקום."),
    points: [tr("בקשות הצטרפות שאתם מאשרים"), tr("לוח משימות לכל חברי הפרויקט"), tr("הודעות פרטיות בזמן אמת")],
    cta: { to: "/collabs", label: tr("לפרויקטים פתוחים") },
  },
  {
    side: "B",
    title: tr("לומדים ממוזיקאים"),
    text: tr("קורסים קצרים של מוזיקאים פעילים: נגינה, הפקה, מיקס וכתיבה. כל שיעור בקצב שלכם."),
    points: [tr("שיעורי וידאו עם תיאור ותרגול"), tr("מעקב אחרי מה שכבר למדתם"), tr("מורים פותחים קורסים משלהם")],
    cta: { to: "/courses", label: tr("לקטלוג הקורסים") },
  },
];

const COUNT_IN = [
  { title: tr("נרשמים"), text: GOOGLE_AUTH_ENABLED ? tr("חינם, עם מייל או חשבון Google.") : tr("חינם, עם כתובת מייל.") },
  { title: tr("ממלאים פרופיל"), text: tr("כלים, ז'אנרים, אזור, ומה אתם מחפשים.") },
  { title: tr("מוצאים אנשים"), text: tr("מסננים לפי כלי, תפקיד, ז'אנר ומיקום.") },
  { title: tr("מתחילים לנגן"), text: tr("שולחים הודעה או מצטרפים לפרויקט.") },
];


/** Sound-wave lines for the blue panels. */
function Waves({ className }) {
  const lines = [0, 1, 2, 3, 4].map((i) => {
    const y = 50 + i * 30, a = 12 + i * 5, f = 0.011 + i * 0.0018;
    const d = Array.from({ length: 121 }, (_, k) => `${k ? "L" : "M"}${k * 10},${(y + a * Math.sin(k * 10 * f + i)).toFixed(1)}`).join(" ");
    return <path key={i} d={d} fill="none" stroke={i === 2 ? "#FF4F81" : "#fff"} strokeOpacity={i === 2 ? 0.9 : 0.13 + i * 0.03} strokeWidth={i === 2 ? 2.5 : 1.5} />;
  });
  return <svg viewBox="0 0 1200 220" preserveAspectRatio="none" className={className} aria-hidden>{lines}</svg>;
}

const BARS = Array.from({ length: 44 }, (_, i) => Math.round(28 + 62 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21))));

/** A still picture of the product: a post with a track, and a musician card. Illustration only. */
function Preview() {
  return (
    <figure className="relative mx-auto w-full max-w-[420px]">
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-pop">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E5E9FB] text-sm font-bold text-primary">{tr("נכ")}</span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold">{tr("נועה כהן")}</p>
            <p className="text-[13px] text-muted-foreground">{tr("זמרת ויוצרת · לפני שעה")}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#FFF0F4] px-3 py-2 text-sm font-semibold text-[#8E1840]">
          <Handshake className="h-4 w-4" aria-hidden />{tr("מחפשת צ'לן/ית לשיר החדש")}
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-ink p-3 text-white">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink"><Play className="h-5 w-5 translate-x-px fill-current" aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-xs"><span className="font-semibold">{tr("קיץ בעיר, דמו")}</span><span className="tabular text-white/60">0:42 / 2:58</span></div>
            <div className="mt-1.5 flex h-7 items-center gap-[2px]">
              {BARS.map((h, i) => <span key={i} style={{ height: `${h}%` }} className={i < 11 ? "flex-1 rounded-full bg-riso-pink" : "flex-1 rounded-full bg-white/25"} />)}
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 border-t border-border/70 pt-2 text-center text-sm text-muted-foreground">
          <span className="flex items-center justify-center gap-1.5"><Heart className="h-4 w-4 fill-riso-pink text-riso-pink" aria-hidden />24</span>
          <span className="flex items-center justify-center gap-1.5"><MessageCircle className="h-4 w-4" aria-hidden />6</span>
          <span className="flex items-center justify-center gap-1.5"><Share2 className="h-4 w-4" aria-hidden />{tr("שיתוף")}</span>
        </div>
      </div>
      <div className="absolute -bottom-[5.5rem] -end-6 hidden w-48 overflow-hidden rounded-2xl border border-border/80 bg-card text-center shadow-pop sm:block">
        <div className="h-10 bg-[#4357D0]" />
        <div className="px-3 pb-3">
          <span className="-mt-7 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFE3EB] text-sm font-bold text-[#B01E4C] ring-4 ring-card">{tr("דל")}</span>
          <p className="mt-1.5 text-sm font-bold">{tr("דנה לוי")}</p>
          <p className="text-xs text-muted-foreground">{tr("בסיסטית · חיפה")}</p>
          <span className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full border border-primary/50 text-[13px] font-semibold text-primary"><UserPlus className="h-3.5 w-3.5" aria-hidden />{tr("מעקב")}</span>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-xs text-muted-foreground sm:mt-28 sm:text-start">{tr("דוגמה להמחשה")}</figcaption>
    </figure>
  );
}

export default function Landing() {
  usePageTitle(null);
  return (
    <div className="overflow-hidden">
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-12 md:grid-cols-[1.15fr_1fr] md:pb-24 md:pt-20">
        <div>
          <h1 className="text-[clamp(2.75rem,7vw,4.5rem)] font-extrabold leading-[1.02] tracking-tight">
            {tr("תמצאו עם מי")}{" "}<span className="text-primary">{tr("לנגן.")}</span>
          </h1>
          <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-foreground/75">
            {APP_NAME}{" "}{tr("היא הרשת החברתית למוזיקאים בישראל. מוצאים שותפים לשיר, ללהקה או להפקה, משתפים קטעים ודמואים, לומדים ממוזיקאים אחרים, ובונים פרופיל מקצועי.")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg"><Link to="/signup">{tr("פתיחת פרופיל חינם")}</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/collabs">{tr("פרויקטים שמחפשים אנשים")}</Link></Button>
          </div>
        </div>
        <Preview />
      </section>

      <section className="border-y border-border/80 bg-card">
        <div className="mx-auto max-w-6xl px-5 py-12 text-center md:py-16">
          <h2 className="text-2xl font-bold tracking-tight md:text-[1.75rem]">{tr("הבמה פתוחה לכולם")}</h2>
          <ul className="mx-auto mt-5 flex max-w-4xl flex-wrap justify-center gap-2">
            {LINEUP.map((role) => <li key={role} className="rounded-full bg-muted px-4 py-2 text-[15px] font-medium">{role}</li>)}
          </ul>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">{tr("מתחילים ומקצוענים, מכל ז'אנר ומכל הארץ.")}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-16 md:grid-cols-2 md:py-24">
        {SIDES.map((s, i) => (
          <div key={s.side} className={i === 0 ? "relative flex flex-col overflow-hidden rounded-3xl bg-riso-blue p-8 text-white md:p-10" : "flex flex-col rounded-3xl border border-border/80 bg-card p-8 shadow-card md:p-10"}>
            {i === 0 && <Waves className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full opacity-70" />}
            <span className={i === 0 ? "flex h-12 w-12 items-center justify-center rounded-xl bg-white/15" : "flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF2C2] text-[#6E5200]"}>
              {i === 0 ? <Handshake className="h-6 w-6" aria-hidden /> : <GraduationCap className="h-6 w-6" aria-hidden />}
            </span>
            <h2 className="mt-5 text-[1.75rem] font-bold tracking-tight">{s.title}</h2>
            <p className={i === 0 ? "mt-3 max-w-md leading-relaxed text-white/85" : "mt-3 max-w-md leading-relaxed text-foreground/75"}>{s.text}</p>
            <ul className="relative mt-6 space-y-2.5">
              {s.points.map((p) => (
                <li key={p} className="flex gap-2.5"><Check className={i === 0 ? "mt-0.5 h-5 w-5 shrink-0 text-riso-yellow" : "mt-0.5 h-5 w-5 shrink-0 text-primary"} aria-hidden />{p}</li>
              ))}
            </ul>
            <Button asChild variant={i === 0 ? "secondary" : "outline"} className={i === 0 ? "relative mt-8 w-fit bg-white text-ink hover:bg-white/90" : "mt-8 w-fit"}>
              <Link to={s.cta.to}>{s.cta.label}</Link>
            </Button>
          </div>
        ))}
      </section>

      <section className="border-y border-border/80 bg-card">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <h2 className="text-[1.75rem] font-bold tracking-tight md:text-[2.25rem]">{tr("מתחילים בארבעה צעדים")}</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {COUNT_IN.map((step, i) => (
              <li key={step.title}>
                <span className="tabular flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-base font-bold text-primary" aria-hidden>{i + 1}</span>
                <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                <p className="mt-1 text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="relative overflow-hidden rounded-3xl bg-riso-blue px-8 py-14 text-center text-white md:py-20">
          <Waves className="pointer-events-none absolute inset-x-0 top-1/2 h-40 w-full -translate-y-1/2" />
          <h2 className="relative text-[clamp(2.25rem,5vw,3.5rem)] font-extrabold leading-tight tracking-tight">{tr("הבמה פנויה.")}</h2>
          <p className="relative mx-auto mt-4 max-w-md text-lg text-white/80">{tr("פותחים פרופיל בשתי דקות, ומתחילים לחפש את האנשים שתרצו לנגן איתם.")}</p>
          <Button asChild size="lg" className="relative mt-8 bg-white text-ink hover:bg-white/90"><Link to="/signup">{tr("פתיחת פרופיל חינם")}</Link></Button>
        </div>
      </section>
    </div>
  );
}
