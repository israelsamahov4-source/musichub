// Shared helpers for the edge functions.
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.49.1";

const allowedOrigins = (Deno.env.get("SITE_URL") ?? "")
  .split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);

/** Primary site URL, used for redirects back from Stripe. */
export const SITE_URL = allowedOrigins[0] ?? "http://localhost:5173";

export function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "";
  const allow = allowedOrigins.includes(origin) || origin.startsWith("http://localhost:") ? origin : SITE_URL;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

/** Admin client: bypasses Row Level Security. Never expose its key to the browser. */
export const admin: SupabaseClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/** Returns the signed-in user from the request's JWT, or null. */
export async function getUser(req: Request): Promise<User | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}
