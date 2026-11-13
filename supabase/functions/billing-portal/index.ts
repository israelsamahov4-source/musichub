// POST -> { url } of the Stripe customer portal (change plan, card, cancel, invoices)
import { admin, corsHeaders, getUser, json, SITE_URL } from "../_shared/http.ts";
import { stripe } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  try {
    const user = await getUser(req);
    if (!user) return json(req, { error: "unauthorized" }, 401);
    const { data: sub } = await admin.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).single();
    if (!sub?.stripe_customer_id) return json(req, { error: "no billing account" }, 404);
    const session = await stripe.billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: `${SITE_URL}/settings` });
    return json(req, { url: session.url });
  } catch (err) {
    console.error("billing-portal", err);
    return json(req, { error: "internal error" }, 500);
  }
});
