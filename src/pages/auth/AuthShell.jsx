import { Link } from "react-router-dom";
import { APP_NAME } from "@/lib/config";
import { usePageTitle } from "@/lib/usePageTitle";

/** Sign-in pages: the form on paper, next to a small piece of the poster. */
export default function AuthShell({ title, subtitle, children, footer }) {
  usePageTitle(title);
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(420px,0.9fr)]">
      <div className="grain flex flex-col sm:px-10 lg:py-8">
        {/* Phones and tablets: a strip of the poster on top, so the brand is there before the form. */}
        <div className="grain relative overflow-hidden bg-riso-blue px-5 pb-6 pt-5 sm:-mx-10 sm:px-10 lg:hidden">
          <span className="absolute -end-10 -top-12 h-32 w-32 rounded-full bg-riso-pink" aria-hidden />
          <span className="absolute end-14 top-3 h-10 w-10 rounded-full bg-riso-yellow" aria-hidden />
          <Link to="/" className="riso-on-blue relative block w-fit font-display text-3xl font-bold leading-none" aria-label={`${APP_NAME} — דף הבית`}>{APP_NAME}</Link>
          <p className="riso-on-blue relative mt-5 font-display text-5xl font-bold leading-[0.85]" aria-hidden>תמצאו עם מי לנגן.</p>
        </div>
        <Link to="/" className="riso hidden w-fit font-display text-4xl font-bold leading-none lg:block" aria-label={`${APP_NAME} — דף הבית`}>{APP_NAME}</Link>
        <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10 sm:px-0">
          <h1 className="font-display text-6xl font-bold leading-[0.9]">{title}</h1>
          {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-muted-foreground">{footer}</div>}
        </main>
      </div>
      <aside className="grain relative hidden overflow-hidden bg-riso-blue lg:flex lg:flex-col lg:justify-end lg:p-12" aria-hidden>
        <p className="riso-on-blue font-display text-[8.5rem] font-bold leading-[0.8]">תמצאו<br />עם מי<br />לנגן.</p>
        <p className="mt-6 max-w-xs text-white/75">גיטריסטים, זמרות, מפיקים ומורים, מכל ז'אנר ומכל הארץ.</p>
        <span className="absolute -start-24 -top-24 h-72 w-72 rounded-full bg-riso-pink" />
        <span className="absolute -start-6 -top-6 h-24 w-24 rounded-full bg-riso-yellow" />
      </aside>
    </div>
  );
}
