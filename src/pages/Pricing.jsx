import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import { callFunction } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { PAYMENTS_ENABLED, PLANS } from "@/lib/config";
import { cn, errorMessage } from "@/lib/utils";
import { openCheckout } from "@/lib/paddle";

export default function Pricing() {
  const { user, profile } = useAuth();
  const [params] = useSearchParams();
  const [cycle, setCycle] = useState("monthly");
  const [busy, setBusy] = useState(null);
  const current = profile?.plan_tier ?? "free";

  useEffect(() => { if (params.get("canceled")) toast("התשלום בוטל. לא חויבתם."); }, [params]);

  const checkout = async (tier) => {
    setBusy(tier);
    try {
      const data = await callFunction("paddle-checkout", { tier, cycle });
      if (!data?.transactionId) throw new Error("checkout failed");
      await openCheckout({ transactionId: data.transactionId, email: user.email });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const action = (plan) => {
    if (plan.tier === current && user) return <Button variant="outline" disabled className="w-full">התוכנית הנוכחית</Button>;
    if (plan.tier === "free") return user ? null : <Button asChild variant="outline" className="w-full"><Link to="/signup">הרשמה חינם</Link></Button>;
    if (!user) return <Button asChild className="w-full"><Link to="/signup">{PAYMENTS_ENABLED ? "הרשמה" : "הרשמה חינם בינתיים"}</Link></Button>;
    if (!PAYMENTS_ENABLED) return <p className="rounded-full border-2 border-dashed border-current px-4 py-2 text-center text-sm font-semibold opacity-80">ייפתח בקרוב</p>;
    if (current !== "free") return <Button asChild variant="outline" className="w-full"><Link to="/settings">שינוי תוכנית בהגדרות</Link></Button>;
    return <Button className="w-full" onClick={() => checkout(plan.tier)} disabled={!!busy}>{busy === plan.tier ? <Loader2 className="animate-spin" /> : null}שדרוג ל-{plan.name}</Button>;
  };

  const toggle = (
    <div className="inline-flex rounded-full border-2 border-white/80 p-1" role="group" aria-label="מחזור חיוב">
      {[["monthly", "חודשי"], ["yearly", "שנתי, חודשיים מתנה"]].map(([v, t]) => (
        <button key={v} type="button" aria-pressed={cycle === v} onClick={() => setCycle(v)}
          className={cn("rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
            cycle === v ? "bg-riso-yellow text-ink" : "text-white/85 hover:text-white", "min-h-10")}>{t}</button>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader tone="blue" title="תוכניות ומחירים"
        text="הרשת, ההודעות והפרויקטים חינמיים לגמרי. מנוי פותח קורסים מתקדמים ואת האפשרות ללמד."
        actions={toggle} />
      <div className="page">
        <div className="grid items-start gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const hot = plan.highlight;
            return (
              <section key={plan.tier} aria-labelledby={`plan-${plan.tier}`}
                className={cn("relative flex h-full flex-col rounded-2xl border-2 border-ink p-6",
                  hot ? "grain bg-ink text-white shadow-[6px_6px_0_0_#FF4F81] md:-translate-y-3" : "bg-card")}>
                {plan.tier !== "free" && !PAYMENTS_ENABLED
                  ? <span className="absolute -top-3 end-6 rotate-[-4deg] rounded-sm border-2 border-ink bg-riso-pink px-3 py-1 text-xs font-bold text-ink">בקרוב</span>
                  : hot && <span className="absolute -top-3 end-6 rotate-[-4deg] rounded-sm border-2 border-ink bg-riso-yellow px-3 py-1 text-xs font-bold text-ink">מומלץ</span>}
                <h2 id={`plan-${plan.tier}`} className={cn("font-display text-4xl font-bold leading-none", hot ? "text-riso-yellow" : "text-riso-blue")}>{plan.name}</h2>
                <p className={cn("mt-2 text-sm", hot ? "text-white/75" : "text-muted-foreground")}>{plan.tagline}</p>
                <p className="mt-5 flex items-baseline gap-1">
                  <span className="text-5xl font-black leading-none tracking-tight">₪{plan.price[cycle]}</span>
                  <span className={hot ? "text-white/70" : "text-muted-foreground"}>/ {cycle === "monthly" ? "חודש" : "שנה"}</span>
                </p>
                <ul className="my-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm">
                      <Check className={cn("mt-0.5 h-4 w-4 shrink-0", hot ? "text-riso-yellow" : "text-riso-pink")} aria-hidden />{f}
                    </li>
                  ))}
                </ul>
                <div className={hot ? "[&_button]:bg-riso-yellow [&_button]:text-ink [&_a]:bg-riso-yellow [&_a]:text-ink" : ""}>{action(plan)}</div>
              </section>
            );
          })}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
          {PAYMENTS_ENABLED ? (
            <>
              המחירים כוללים מע"מ. אפשר לבטל בכל עת, והמנוי יישאר פעיל עד סוף תקופת החיוב.
              התשלום מתבצע אצל Paddle, ספק התשלומים שלנו. פרטי הכרטיס לא עוברים דרכנו ולא נשמרים אצלנו.
            </>
          ) : (
            <>המנויים בתשלום ייפתחו בקרוב. בינתיים כל מה שבחינם פתוח לכולם: פרופיל, פרויקטים, הודעות וקורסים חינמיים.</>
          )}
        </p>
      </div>
    </>
  );
}
