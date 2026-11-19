import { Link } from "react-router-dom";
import { APP_NAME } from "@/lib/config";
import { usePageTitle } from "@/lib/usePageTitle";
import LogoMark from "@/components/LogoMark";

function Wordmark() {
  return (
    <Link to="/" className="flex w-fit items-center gap-2" aria-label={`${APP_NAME} — דף הבית`}>
      <LogoMark className="h-8 w-8" />
      <span className="ltr text-[1.2rem] font-extrabold tracking-tight text-foreground">Music<span className="text-primary">Hub</span></span>
    </Link>
  );
}

/** Sound-wave lines across the blue brand panel. */
function Waves() {
  const lines = [0, 1, 2, 3, 4, 5].map((i) => {
    const y = 60 + i * 34, a = 14 + i * 5, f = 0.011 + i * 0.0015;
    const d = Array.from({ length: 61 }, (_, k) => `${k ? "L" : "M"}${k * 10},${(y + a * Math.sin(k * 10 * f + i * 0.9)).toFixed(1)}`).join(" ");
    return <path key={i} d={d} fill="none" stroke={i === 3 ? "#FF4F81" : "#fff"} strokeOpacity={i === 3 ? 0.9 : 0.12 + i * 0.03} strokeWidth={i === 3 ? 3 : 1.5} />;
  });
  return <svg viewBox="0 0 600 280" preserveAspectRatio="none" className="absolute inset-x-0 top-1/4 h-2/5 w-full" aria-hidden>{lines}</svg>;
}

/** Sign-in pages: the form on a clean white side, the brand on a blue panel beside it. */
export default function AuthShell({ title, subtitle, children, footer }) {
  usePageTitle(title);
  return (
    <div className="grid min-h-screen bg-card lg:grid-cols-[1fr_minmax(440px,0.85fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:py-8">
        <Wordmark />
        <main id="main" className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <h1 className="text-[2rem] font-bold leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-muted-foreground">{footer}</div>}
        </main>
      </div>
      <aside className="relative hidden overflow-hidden bg-riso-blue p-12 text-white lg:flex lg:flex-col lg:justify-end" aria-hidden>
        <Waves />
        <p className="relative text-[3.25rem] font-extrabold leading-[1.05] tracking-tight">תמצאו עם מי<br />לנגן.</p>
        <p className="relative mt-4 max-w-xs text-[15px] text-white/80">גיטריסטים, זמרות, מפיקים ומורים, מכל ז'אנר ומכל הארץ.</p>
      </aside>
    </div>
  );
}
