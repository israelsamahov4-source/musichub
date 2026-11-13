import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/lib/supabase";
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
      const { data, error } = await supabase.functions.invoke("paddle-checkout", { body: { tier, cycle } });
      if (error || !data?.transactionId) throw error ?? new Error("checkout failed");
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
    if (!PAYMENTS_ENABLED) return <Button disabled className="w-full">בקרוב</Button>;
    if (!user) return <Button asChild className="w-full"><Link to="/signup">הרשמה</Link></Button>;
    if (current !== "free") return <Button asChild variant="outline" className="w-full"><Link to="/settings">שינוי תוכנית בהגדרות</Link></Button>;
    return <Button className="w-full" onClick={() => checkout(plan.tier)} disabled={!!busy}>{busy === plan.tier ? <Loader2 className="animate-spin" /> : null}שדרוג ל-{plan.name}</Button>;
  };

  const toggle = (
    <div className="inline-flex rounded-full border-2 border-white/80 p-1" role="radiogroup" aria-label="מחזור חיוב">
      {[["monthly", "חודשי"], ["yearly", "שנתי · חודשיים מתנה"]].map(([v, t]) => (
        <button key={v} role="radio" aria-checked={cycle === v} onClick={() => setCycle(v)}
          className={cn("rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
            cycle === v ? "bg-riso-yellow text-ink" : "text-white/85 hover:text-white")}>{t}</button>
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
                {hot && <span className="tape absolute -top-3 left-6 rotate-[-4deg] bg-riso-yellow px-3 py-1 text-xs font-bold text-ink">הכי פופולרי</span>}
                <h2 id={`plan-${plan.tier}`} className={cn("font-display text-4xl font-bold leading-none", hot ? "text-riso-yellow" : "text-riso-blue")}>{plan.name}</h2>
                <p className={cn("mt-2 text-sm", hot ? "text-white/75" : "text-muted-foreground")}>{plan.tagline}</p>
                <p className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-6xl font-bold leading-none">₪{plan.price[cycle]}</span>
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
          המחירים כוללים מע"מ. אפשר לבטל בכל עת, והמנוי יישאר פעיל עד סוף תקופת החיוב.
          התשלום מתבצע אצל Paddle, ספק התשלומים שלנו. פרטי הכרטיס לא עוברים דרכנו ולא נשמרים אצלנו.
        </p>
      </div>
    </>
  );
}
