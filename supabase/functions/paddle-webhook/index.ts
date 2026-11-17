// Paddle -> our database. The ONLY place where a user's plan changes.
// Turn OFF "Verify JWT" for this function: Paddle authenticates with a signature instead.
// ---- shared helpers (kept inline so this file can be pasted into the Supabase dashboard) ----
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const SITES = (Deno.env.get("SITE_URL") ?? "https://musichub-wheat.vercel.app")
  .split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
const SITE = SITES[0];

function cors(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "";
  const allow = SITES.includes(origin) || origin.startsWith("http://localhost:") ? origin : SITE;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

// Admin client: bypasses Row Level Security. Its key never leaves the server.
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * The signed-in user, or null. When the user has two-step verification turned on, a session that
 * only used the password (aal1) is refused, exactly like the database does.
 */
async function getUser(req: Request) {
  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return null;
  const hasFactor = (data.user.factors ?? []).some((f) => f.status === "verified");
  if (hasFactor) {
    try {
      const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.aal !== "aal2") return null;
    } catch {
      return null;
    }
  }
  return data.user;
}

const enc = new TextEncoder();
async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
  return Array.from(mac).map((b) => b.toString(16).padStart(2, "0")).join("");
}
/** Ties a checkout to the account that started it, so a buyer can't attach a subscription to someone else. */
const accountSig = (userId: string) => hmacHex(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, `paddle-account:${userId}`);

const PADDLE_API = Deno.env.get("PADDLE_ENV") === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
async function paddle(path: string, init: RequestInit = {}) {
  const key = Deno.env.get("PADDLE_API_KEY");
  if (!key) throw new Error("payments not configured");
  const res = await fetch(`${PADDLE_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`paddle ${res.status}: ${JSON.stringify(body?.error ?? body).slice(0, 300)}`);
  return body.data;
}

const PRICES: Record<string, Record<string, string | undefined>> = {
  pro: { monthly: Deno.env.get("PADDLE_PRICE_PRO_MONTHLY"), yearly: Deno.env.get("PADDLE_PRICE_PRO_YEARLY") },
  premium: { monthly: Deno.env.get("PADDLE_PRICE_PREMIUM_MONTHLY"), yearly: Deno.env.get("PADDLE_PRICE_PREMIUM_YEARLY") },
};
function planForPrice(priceId?: string) {
  for (const tier of Object.keys(PRICES)) for (const cycle of Object.keys(PRICES[tier])) {
    if (priceId && PRICES[tier][cycle] === priceId) return { tier, cycle };
  }
  return null;
}
// ---- end shared helpers ----

const ACTIVE = ["active", "trialing", "past_due"];

/** Paddle-Signature: "ts=1700000000;h1=<hex hmac of 'ts:body'>" */
async function validSignature(header: string | null, body: string, secret: string) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(";").map((p) => p.split("=") as [string, string]));
  const ts = Number(parts.ts);
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) return false; // reject replays older than 5 minutes
  const expected = await hmacHex(secret, `${parts.ts}:${body}`);
  const given = parts.h1 ?? "";
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

/** Which account does this subscription belong to? Only a signed binding from our own checkout counts. */
async function ownerOf(s: { id: string; customer_id: string; custom_data?: { user_id?: string; sig?: string } }) {
  const claimed = s.custom_data?.user_id;
  if (claimed && s.custom_data?.sig && s.custom_data.sig === (await accountSig(claimed))) return claimed;
  const { data: bySub } = await admin.from("subscriptions").select("user_id").eq("provider_subscription_id", s.id).maybeSingle();
  if (bySub) return bySub.user_id as string;
  const { data: byCustomer } = await admin.from("subscriptions").select("user_id").eq("provider_customer_id", s.customer_id).maybeSingle();
  return (byCustomer?.user_id as string) ?? null;
}

async function syncSubscription(subscriptionId: string) {
  // Always re-read from Paddle so events that arrive out of order can't leave stale state.
  const s = await paddle(`/subscriptions/${subscriptionId}`);
  const userId = await ownerOf(s);
  if (!userId) { console.warn("subscription with no known account", s.id); return; }

  const { data: row } = await admin.from("subscriptions")
    .select("tier, status, provider_subscription_id").eq("user_id", userId).maybeSingle();
  const active = ACTIVE.includes(s.status);
  const current = row?.provider_subscription_id;
  if (current && current !== s.id) {
    const currentActive = row && row.tier !== "free" && ACTIVE.includes(row.status);
    // An old, cancelled or second subscription must never overwrite the one the user is paying for.
    if (currentActive) {
      if (active) console.error("second active subscription for one account; cancel one in Paddle", { userId, current, other: s.id });
      return;
    }
  }

  const plan = planForPrice(s.items?.[0]?.price?.id);
  if (active && !plan) {
    // Misconfigured price id: fail loudly (Paddle retries) instead of silently downgrading a paying user.
    throw new Error(`unknown price ${s.items?.[0]?.price?.id} on subscription ${s.id}`);
  }
  const tier = plan && active ? plan.tier : "free";
  const { error } = await admin.from("subscriptions").update({
    tier,
    status: s.status,
    billing_cycle: plan?.cycle ?? null,
    provider: "paddle",
    provider_customer_id: s.customer_id,
    // keep the id while paused too, so cancelling (or deleting the account) can still find it
    provider_subscription_id: s.status === "canceled" ? null : s.id,
    current_period_end: s.current_billing_period?.ends_at ?? null,
    cancel_at_period_end: s.scheduled_change?.action === "cancel",
  }).eq("user_id", userId);
  if (error) throw error;
  const { error: e2 } = await admin.from("profiles").update({ plan_tier: tier }).eq("id", userId);
  if (e2) throw e2;
  return { userId, status: s.status };
}

async function notify(userId: string, message: string) {
  await admin.from("notifications").insert({ user_id: userId, type: "subscription", message, link: "/settings" });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const body = await req.text();
  if (!(await validSignature(req.headers.get("paddle-signature"), body, Deno.env.get("PADDLE_WEBHOOK_SECRET") ?? ""))) {
    return new Response("invalid signature", { status: 401 });
  }
  try {
    const event = JSON.parse(body);
    const type: string = event.event_type ?? "";
    if (type.startsWith("subscription.")) {
      const result = await syncSubscription(event.data.id);
      if (result && type === "subscription.created") await notify(result.userId, "המנוי הופעל. תודה שהצטרפתם!");
      if (result && type === "subscription.past_due") await notify(result.userId, "התשלום על המנוי נכשל. עדכנו אמצעי תשלום בהגדרות.");
      if (result && type === "subscription.canceled") await notify(result.userId, "המנוי בוטל.");
    }
    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("paddle-webhook", err);
    return new Response("handler error", { status: 500 }); // Paddle retries
  }
});
