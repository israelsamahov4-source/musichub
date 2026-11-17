import { useLocation } from "react-router-dom";

export const PENDING_NEXT_KEY = "mh-next-after-signup";

const NO_RETURN = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/confirm", "/onboarding"];

/** Link to login/sign-up that brings the visitor back to the page they were looking at. */
export function useAuthHref(base) {
  const { pathname, search } = useLocation();
  if (NO_RETURN.includes(pathname)) {
    // Already on an auth page: pass along an existing ?next=
    const next = new URLSearchParams(search).get("next");
    return next ? `${base}?next=${encodeURIComponent(next)}` : base;
  }
  return `${base}?next=${encodeURIComponent(pathname + search)}`;
}
