// POST { tier: "pro" | "premium", cycle: "monthly" | "yearly" } -> { url }
import { admin, corsHeaders, getUser, json, SITE_URL } from "../_shared/http.ts";
import { PRICES, stripe, type Cycle, type Tier } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method not allowed" }, 405);
  try {
    const user = await getUser(req);
    if (!user) return json(req, { error: "unauthorized" }, 401);

    const { tier, cycle } = await req.json().catch(() => ({}));
    const price = PRICES[tier as Tier]?.[cycle as Cycle];
    if (!price) return json(req, { error: "invalid plan" }, 400);

    const { data: sub } = await admin.from("subscriptions").select("*").eq("user_id", user.id).single();
    if (sub?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(sub.status) && sub.tier !== "free") {
      return json(req, { error: "already subscribed; use the billing portal to change plan" }, 409);
    }

    let customer = sub?.stripe_customer_id as string | null;
    if (!customer) {
      const created = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
      customer = created.id;
      await admin.from("subscriptions").update({ stripe_customer_id: customer }).eq("user_id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      locale: "auto",
      subscription_data: { metadata: { user_id: user.id } },
      metadata: { user_id: user.id },
      success_url: `${SITE_URL}/settings?checkout=success`,
      cancel_url: `${SITE_URL}/pricing?canceled=1`,
    });
    return json(req, { url: session.url });
  } catch (err) {
    console.error("create-checkout", err);
    return json(req, { error: "internal error" }, 500);
  }
});
