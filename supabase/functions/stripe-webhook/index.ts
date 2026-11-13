// Stripe -> our database. The ONLY place where a user's plan is changed.
// Deploy with --no-verify-jwt (Stripe doesn't send a Supabase token); requests are
// authenticated by verifying Stripe's signature instead.
import Stripe from "npm:stripe@17.7.0";
import { admin } from "../_shared/http.ts";
import { planForPrice, stripe } from "../_shared/stripe.ts";

const cryptoProvider = Stripe.createSubtleCryptoProvider();
const ACTIVE = ["active", "trialing", "past_due"];

async function userIdFor(sub: Stripe.Subscription): Promise<string | null> {
  if (sub.metadata?.user_id) return sub.metadata.user_id;
  const { data } = await admin.from("subscriptions").select("user_id").eq("stripe_customer_id", sub.customer as string).maybeSingle();
  return data?.user_id ?? null;
}

async function syncSubscription(sub: Stripe.Subscription) {
  const userId = await userIdFor(sub);
  if (!userId) { console.warn("no user for subscription", sub.id); return; }
  const plan = planForPrice(sub.items.data[0]?.price?.id);
  const tier = plan && ACTIVE.includes(sub.status) ? plan.tier : "free";
  const ended = !ACTIVE.includes(sub.status);

  const { error } = await admin.from("subscriptions").update({
    tier,
    status: sub.status,
    billing_cycle: plan?.cycle ?? null,
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: ended ? null : sub.id,
    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
  }).eq("user_id", userId);
  if (error) throw error;
  const { error: e2 } = await admin.from("profiles").update({ plan_tier: tier }).eq("id", userId);
  if (e2) throw e2;
}

async function notify(userId: string, message: string) {
  await admin.from("notifications").insert({ user_id: userId, type: "subscription", message, link: "/settings" });
}

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? "", Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "", undefined, cryptoProvider);
  } catch (err) {
    console.error("bad signature", (err as Error).message);
    return new Response("invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === "subscription" && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(s.subscription as string);
          await syncSubscription(sub);
          const userId = await userIdFor(sub);
          if (userId) await notify(userId, "המנוי הופעל. תודה שהצטרפתם!");
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        // Always re-read from Stripe so out-of-order events can't leave stale state.
        await syncSubscription(await stripe.subscriptions.retrieve((event.data.object as Stripe.Subscription).id));
        break;
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const { data } = await admin.from("subscriptions").select("user_id").eq("stripe_customer_id", inv.customer as string).maybeSingle();
        if (data) await notify(data.user_id, "התשלום על המנוי נכשל. עדכנו אמצעי תשלום בהגדרות.");
        break;
      }
    }
    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("webhook handler failed", event.type, err);
    return new Response("handler error", { status: 500 }); // Stripe will retry
  }
});
