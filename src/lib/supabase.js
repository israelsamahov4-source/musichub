import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

// The anon key is public by design: every request is checked by the
// Row Level Security rules in supabase/migrations.
export const supabase = isConfigured
  ? createClient(url, anonKey, {
      // "implicit": links in Supabase's default e-mails then work on any device or browser
      // (with "pkce" they only worked in the browser that asked for them). Once custom e-mail templates
      // are enabled, the templates in supabase/templates link to /auth/confirm, which works with either mode.
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
    })
  : null;

/** Throws the Supabase error (if any) and returns data. */
export function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

/**
 * Calls a server (edge) function. On failure throws an Error whose message is the function's own
 * `{ error }` text (e.g. "already subscribed"), so errorMessage() can show a meaningful Hebrew message.
 */
export async function callFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, body ? { body } : undefined);
  if (!error) return data;
  let detail = error.message;
  try { detail = (await error.context?.json())?.error || detail; } catch { /* not JSON */ }
  throw new Error(detail);
}
