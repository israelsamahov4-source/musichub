import { useEffect } from "react";

const SITE = "MusicHub";

/** Sets the browser-tab title (also what screen readers announce on a new page). */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : `${SITE} — הרשת החברתית למוזיקאים`;
  }, [title]);
}
