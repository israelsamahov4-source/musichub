// POST { confirm: "<username>" } -> deletes the caller's files, subscription and account.
import { admin, corsHeaders, getUser, json } from "../_shared/http.ts";
import { stripe } from "../_shared/stripe.ts";

async function removeFolder(bucket: string, folder: string) {
  for (;;) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 100 });
    if (error || !data?.length) return;
    await admin.storage.from(bucket).remove(data.map((f) => `${folder}/${f.name}`));
    if (data.length < 100) return;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method not allowed" }, 405);
  try {
    const user = await getUser(req);
    if (!user) return json(req, { error: "unauthorized" }, 401);
    const { confirm } = await req.json().catch(() => ({}));
    const { data: profile } = await admin.from("profiles").select("username").eq("id", user.id).single();
    if (!profile || confirm !== profile.username) return json(req, { error: "confirmation does not match" }, 400);

    const { data: sub } = await admin.from("subscriptions").select("stripe_subscription_id").eq("user_id", user.id).single();
    if (sub?.stripe_subscription_id && Deno.env.get("STRIPE_SECRET_KEY")) {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id).catch((e) => console.error("cancel failed", e));
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
