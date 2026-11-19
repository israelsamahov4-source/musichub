import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageLoader from "@/components/PageLoader";
import AuthShell from "./AuthShell";
import { PENDING_NEXT_KEY } from "@/auth/returnTo";
import { supabase } from "@/lib/supabase";
import { tr } from "@/lib/i18n";

const TYPES = ["email", "signup", "recovery", "email_change", "invite", "magiclink"];

/**
 * Landing page for links in our e-mails. The link carries a one-time token (token_hash),
 * so it works on any device and in any browser, not only where the request was made.
 */
export default function AuthConfirm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token_hash = params.get("token_hash");
    const type = params.get("type");
    if (!token_hash || !TYPES.includes(type)) { setFailed(true); return; }
    supabase.auth.verifyOtp({ token_hash, type }).then(({ error }) => {
      if (error) { setFailed(true); return; }
      if (type === "recovery") { navigate("/reset-password", { replace: true }); return; }
      let next = null;
      try { next = localStorage.getItem(PENDING_NEXT_KEY); localStorage.removeItem(PENDING_NEXT_KEY); } catch { /* private mode */ }
      navigate(next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding", { replace: true });
    });
  }, [params, navigate]);

  if (!failed) return <PageLoader />;
  const recovery = params.get("type") === "recovery";
  return (
    <AuthShell title={tr("הקישור כבר לא תקף")}>
      <p className="mb-4">
        {recovery
          ? tr("הקישור לאיפוס הסיסמה כבר שומש או שפג תוקפו. אפשר לבקש קישור חדש.")
          : tr("הקישור כבר שומש או שפג תוקפו. אם כבר אישרתם את המייל, פשוט התחברו.")}
      </p>
      <Button asChild className="w-full">
        <Link to={recovery ? "/forgot-password" : "/login"}>{recovery ? tr("קישור חדש") : tr("להתחברות")}</Link>
      </Button>
    </AuthShell>
  );
}
