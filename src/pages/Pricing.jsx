import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  return (
    <div className="page">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="page-title">תוכניות ומחירים</h1>
        <p className="mt-2 text-muted-foreground">הרשת החברתית, ההודעות והפרויקטים חינמיים לגמרי. מנוי פותח גישה לקורסים מתקדמים ולאפשרות ללמד.</p>
        <div className="mt-6 inline-flex rounded-lg border bg-card p-1" role="radiogroup" aria-label="מחזור חיוב">
          {[["monthly", "חודשי"], ["yearly", "שנתי (חודשיים מתנה)"]].map(([v, t]) => (
            <button key={v} role="radio" aria-checked={cycle === v} onClick={() => setCycle(v)}
              className={cn("rounded-md px-4 py-1.5 text-sm font-medium", cycle === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{t}</button>
          ))}
        </div>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card key={plan.tier} className={cn("flex flex-col p-6", plan.highlight && "border-primary shadow-lg ring-1 ring-primary")}>
            {plan.highlight && <span className="mb-2 w-fit rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">הכי פופולרי</span>}
            <h2 className="text-xl font-bold">{plan.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
            <p className="mt-4">
              <span className="text-4xl font-extrabold">₪{plan.price[cycle]}</span>
              <span className="text-muted-foreground"> / {cycle === "monthly" ? "חודש" : "שנה"}</span>
            </p>
            <ul className="my-6 flex-1 space-y-2">
              {plan.features.map((f) => <li key={f} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />{f}</li>)}
            </ul>
            {action(plan)}
          </Card>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        המחירים כוללים מע"מ. אפשר לבטל בכל עת, והמנוי יישאר פעיל עד סוף תקופת החיוב.
        התשלום מאובטח ומתבצע אצל Paddle, ספק התשלומים שלנו. פרטי הכרטיס לא עוברים דרכנו ולא נשמרים אצלנו.
      </p>
    </div>
  );
}
