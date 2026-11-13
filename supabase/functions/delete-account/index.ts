// POST { confirm: "<username>" } -> cancels the subscription, deletes the user's files and account.
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

async function getUser(req: Request) {
  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await admin.auth.getUser(jwt);
  return error ? null : data.user;
}

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

async function removeFolder(bucket: string, folder: string) {
  for (;;) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 100 });
    if (error || !data?.length) return;
    await admin.storage.from(bucket).remove(data.map((f) => `${folder}/${f.name}`));
    if (data.length < 100) return;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method not allowed" }, 405);
  try {
    const user = await getUser(req);
    if (!user) return json(req, { error: "unauthorized" }, 401);
    const { confirm } = await req.json().catch(() => ({}));
    const { data: profile } = await admin.from("profiles").select("username").eq("id", user.id).single();
    if (!profile || confirm !== profile.username) return json(req, { error: "confirmation does not match" }, 400);

    const { data: sub } = await admin.from("subscriptions").select("provider_subscription_id").eq("user_id", user.id).single();
    if (sub?.provider_subscription_id && Deno.env.get("PADDLE_API_KEY")) {
      await paddle(`/subscriptions/${sub.provider_subscription_id}/cancel`, {
        method: "POST", body: JSON.stringify({ effective_from: "immediately" }),
      }).catch((e) => console.error("cancel failed", e));
    }
    await removeFolder("avatars", user.id);
    await removeFolder("media", user.id);
    // Every table cascades from auth.users, so this removes all of the user's rows.
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return json(req, { deleted: true });
  } catch (err) {
    console.error("delete-account", err);
    return json(req, { error: "internal error" }, 500);
  }
});
