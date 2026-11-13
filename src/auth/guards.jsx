import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import PageLoader from "@/components/PageLoader";
import MfaChallenge from "./MfaChallenge";

/** Pages that need a signed-in user who has finished onboarding. */
export function RequireAuth({ children, allowIncompleteProfile = false }) {
  const { user, profile, loading, mfaRequired } = useAuth();
  const location = useLocation();
  const qc = useQueryClient();
  if (loading) return <PageLoader />;
  if (user && mfaRequired) return <MfaChallenge onDone={() => qc.invalidateQueries({ queryKey: ["mfa-level"] })} />;
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
  const { user, loading, mfaRequired } = useAuth();
  const qc = useQueryClient();
  if (loading) return <PageLoader />;
  if (user && mfaRequired) return <MfaChallenge onDone={() => qc.invalidateQueries({ queryKey: ["mfa-level"] })} />;
  if (user) return <Navigate to={safeNext()} replace />;
  return children;
}

/** Only allow same-site relative redirects (prevents open-redirect attacks). */
export function safeNext(fallback = "/feed") {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}
