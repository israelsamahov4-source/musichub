import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";

const SETLIST = [
  { song: "מתופף ללהקה", note: "120 BPM" },
  { song: "שיר עם זמרת מחיפה", note: "Am" },
  { song: "שיעור מיקס ממפיק", note: "6/8" },
  { song: "דמו ותגובות מאנשים", note: "הדרן" },
];

const LINEUP = [
  "גיטריסטים", "זמרות", "מתופפים", "מפיקות", "בסיסטים", "כותבות שירים",
  "קלידנים", "נגני עוד", "DJs", "מורות לנגינה", "סאונדמנים", "מעבדות", "כנרים", "ראפרים",
];

const SIDES = [
  {
    side: "A",
    title: "יוצרים ביחד",
    text: "פותחים פרויקט לשיר, לאלבום או ללהקה, כותבים את מי מחפשים, ומנהלים את העבודה באותו מקום.",
    points: ["בקשות הצטרפות שאתם מאשרים", "לוח משימות לכל חברי הפרויקט", "הודעות פרטיות בזמן אמת"],
    cta: { to: "/collabs", label: "לפרויקטים פתוחים" },
    tone: "bg-riso-blue text-white",
    label: "bg-riso-pink",
  },
  {
    side: "B",
    title: "לומדים ממוזיקאים",
    text: "קורסים קצרים של מוזיקאים פעילים: נגינה, הפקה, מיקס וכתיבה. כל שיעור בקצב שלכם.",
    points: ["שיעורי וידאו עם תיאור ותרגול", "מעקב אחרי מה שכבר למדתם", "מורים פותחים קורסים משלהם"],
    cta: { to: "/courses", label: "לקטלוג הקורסים" },
    tone: "bg-white text-ink",
    label: "bg-riso-blue",
  },
];

const COUNT_IN = [
  { title: "נרשמים", text: "חינם, עם מייל או חשבון Google." },
  { title: "ממלאים פרופיל", text: "כלים, ז'אנרים, אזור, ומה אתם מחפשים." },
  { title: "מוצאים אנשים", text: "מסננים לפי כלי, תפקיד, ז'אנר ומיקום." },
  { title: "מתחילים לנגן", text: "שולחים הודעה או מצטרפים לפרויקט." },
];

export default function Landing() {
  return (
    <div className="overflow-hidden">
      {/* Hero: the poster */}
      <section className="grain">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 md:grid-cols-[1.3fr_1fr] md:pb-24 md:pt-16">
          <div>
            <h1 className="riso riso-animate font-display text-[clamp(4.5rem,13vw,10rem)] font-bold leading-[0.8] tracking-tight">
              תמצאו<br />עם מי<br />לנגן.
            </h1>
            <p className="mt-8 max-w-[34rem] text-lg leading-relaxed text-ink/80">
              {APP_NAME} היא רשת חברתית למוזיקאים בישראל. מוצאים שותפים לשיר, ללהקה או להפקה, לומדים ממוזיקאים אחרים, ובונים פרופיל שמראה מה אתם עושים.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="h-12 rounded-full px-7 text-base shadow-[4px_4px_0_#FF4F81] transition-shadow hover:shadow-[2px_2px_0_#FF4F81]">
                <Link to="/signup">פתיחת פרופיל חינם</Link>
              </Button>
              <Link to="/collabs" className="text-base font-medium text-ink underline decoration-riso-pink decoration-2 underline-offset-[6px] hover:decoration-4">
                פרויקטים שמחפשים אנשים
              </Link>
            </div>
          </div>

          {/* The setlist, taped to the stage floor */}
          <div className="relative mx-auto w-full max-w-sm md:-rotate-2" aria-label="מה עושים כאן">
            <span className="tape -top-3 start-10 -rotate-6" aria-hidden />
            <span className="tape -bottom-3 end-8 rotate-3" aria-hidden />
            <div className="bg-white px-7 pb-8 pt-7 shadow-[0_18px_40px_-18px_rgba(30,27,58,0.45)]">
              <p className="font-display text-5xl font-bold text-riso-pink">סטליסט</p>
              <ol className="mt-3">
                {SETLIST.map((s, i) => (
                  <li key={s.song} className="flex h-12 items-end gap-3 border-b border-[#E3E6F2] pb-1 font-display text-[2.1rem] leading-none text-ink">
                    <span className="w-5 text-riso-blue">{i + 1}</span>
                    <span className="flex-1 truncate">{s.song}</span>
                    <span className="text-xl text-ink/45">{s.note}</span>
                  </li>
                ))}
                <li className="flex h-12 items-end gap-3 border-b border-[#E3E6F2] pb-1 font-display text-[2.1rem] leading-none text-ink/35">
                  <span className="w-5" />
                  <span className="line-through decoration-riso-pink decoration-2">לחפש בפייסבוק</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Festival line-up of who the site is for */}
      <section className="grain bg-riso-blue text-white">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center md:py-20">
          <h2 className="text-lg text-white/75">הבמה פתוחה ל</h2>
          <p className="mx-auto mt-4 max-w-5xl font-display text-[clamp(2.4rem,6vw,4.5rem)] font-bold leading-[1.02]">
            {LINEUP.map((role, i) => (
              <span key={role} className={"whitespace-nowrap " + (i % 3 === 1 ? "text-[#FFA6C0]" : i % 3 === 2 ? "text-riso-yellow" : "")}>
                {role}{i < LINEUP.length - 1 && <span className="mx-3 inline-block text-white/40" aria-hidden>/</span>}
              </span>
            ))}
          </p>
          <p className="mx-auto mt-6 max-w-xl text-white/80">מתחילים ומקצוענים, מכל ז'אנר ומכל הארץ.</p>
        </div>
      </section>

      {/* Side A / Side B */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="grid overflow-hidden rounded-[1.75rem] border-2 border-ink md:grid-cols-2">
          {SIDES.map((s) => (
            <div key={s.side} className={`relative flex flex-col p-8 md:p-10 ${s.tone}`}>
              <div className="flex items-center gap-4">
                <span className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${s.label}`} aria-hidden>
                  <span className="absolute h-2.5 w-2.5 rounded-full bg-paper" />
                  <span className="sr-only">צד {s.side}</span>
                </span>
                <div>
                  <p className="text-sm opacity-70">צד {s.side}</p>
                  <h2 className="font-display text-5xl font-bold leading-none">{s.title}</h2>
                </div>
              </div>
              <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed opacity-90">{s.text}</p>
              <ul className="mt-6 space-y-2">
                {s.points.map((p) => (
                  <li key={p} className="flex gap-3"><span className="mt-2.5 h-1.5 w-4 shrink-0 rounded-full bg-riso-pink" aria-hidden />{p}</li>
                ))}
              </ul>
              <Link to={s.cta.to} className="mt-8 w-fit font-semibold underline decoration-riso-pink decoration-2 underline-offset-[6px] hover:decoration-4">
                {s.cta.label}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Count-in: four steps, four beats */}
      <section className="border-y-2 border-ink bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <h2 className="font-display text-5xl font-bold md:text-6xl">ספירה לפני שמתחילים</h2>
          <ol className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {COUNT_IN.map((step, i) => (
              <li key={step.title}>
                <span className="riso block font-display text-8xl font-bold leading-none" aria-hidden>{i + 1}</span>
                <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
                <p className="mt-1 text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing poster */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="grain relative overflow-hidden rounded-[1.75rem] bg-ink px-8 py-14 text-center md:py-20">
          <h2 className="riso-on-blue font-display text-[clamp(4rem,10vw,7.5rem)] font-bold leading-[0.85]">הבמה פנויה.</h2>
          <p className="mx-auto mt-5 max-w-md text-lg text-white/75">פותחים פרופיל בשתי דקות, ומתחילים לחפש את האנשים שתרצו לנגן איתם.</p>
          <Button asChild size="lg" className="mt-8 h-12 rounded-full bg-white px-8 text-base text-ink shadow-[4px_4px_0_#FF4F81] hover:bg-white hover:shadow-[2px_2px_0_#FF4F81]">
            <Link to="/signup">פתיחת פרופיל חינם</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
