import { Link } from "react-router-dom";
import { APP_NAME } from "@/lib/config";

/** Sign-in pages: the form on paper, next to a small piece of the poster. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(420px,0.9fr)]">
      <div className="grain flex flex-col px-5 py-8 sm:px-10">
        <Link to="/" className="riso w-fit font-display text-4xl font-bold leading-none" aria-label={`${APP_NAME} — דף הבית`}>{APP_NAME}</Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-6xl font-bold leading-[0.9]">{title}</h1>
          {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
      <aside className="grain relative hidden overflow-hidden bg-riso-blue lg:flex lg:flex-col lg:justify-end lg:p-12" aria-hidden>
        <p className="riso-on-blue font-display text-[8.5rem] font-bold leading-[0.8]">תמצאו<br />עם מי<br />לנגן.</p>
        <p className="mt-6 max-w-xs text-white/75">גיטריסטים, זמרות, מפיקים ומורים, מכל ז'אנר ומכל הארץ.</p>
        <span className="absolute -start-24 -top-24 h-72 w-72 rounded-full bg-riso-pink/80 mix-blend-multiply" />
        <span className="absolute -start-6 -top-6 h-24 w-24 rounded-full bg-riso-yellow/90 mix-blend-multiply" />
      </aside>
    </div>
  );
}
