import { useEffect } from "react";
import { tr } from "@/lib/i18n";

const SITE = "Jamly";

/** Sets the browser-tab title (also what screen readers announce on a new page). */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : tr("{0} — הרשת החברתית למוזיקאים", SITE);
  }, [title]);
}
