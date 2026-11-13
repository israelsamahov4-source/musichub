// Single-file version of delete-account, for pasting into the Supabase dashboard editor.
// POST { confirm: "<username>" } -> deletes the caller's files, subscription and account.
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const SITES = (Deno.env.get("SITE_URL") ?? "https://musichub-wheat.vercel.app")
  .split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);

function cors(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "";
  const allow = SITES.includes(origin) || origin.startsWith("http://localhost:") ? origin : SITES[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json(req, { error: "unauthorized" }, 401);
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) return json(req, { error: "unauthorized" }, 401);
    const user = auth.user;

    const { confirm } = await req.json().catch(() => ({}));
    const { data: profile } = await admin.from("profiles").select("username").eq("id", user.id).single();
    if (!profile || confirm !== profile.username) return json(req, { error: "confirmation does not match" }, 400);

    // Cancel a paid subscription first (only once payments are configured)
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const { data: sub } = await admin.from("subscriptions").select("stripe_subscription_id").eq("user_id", user.id).single();
    if (stripeKey && sub?.stripe_subscription_id) {
      await fetch(`https://api.stripe.com/v1/subscriptions/${sub.stripe_subscription_id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${stripeKey}` },
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
