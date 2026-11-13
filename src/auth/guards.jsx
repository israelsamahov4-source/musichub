import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import PageLoader from "@/components/PageLoader";

/** Pages that need a signed-in user who has finished onboarding. */
export function RequireAuth({ children, allowIncompleteProfile = false }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (!allowIncompleteProfile && profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

/** Login / sign-up pages: bounce signed-in users into the app. */
export function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to={safeNext()} replace />;
  return children;
}

/** Only allow same-site relative redirects (prevents open-redirect attacks). */
export function safeNext(fallback = "/feed") {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}
