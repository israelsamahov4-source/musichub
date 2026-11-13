import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

// The anon key is public by design: every request is checked by the
// Row Level Security rules in supabase/migrations.
export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
    })
  : null;

/** Throws the Supabase error (if any) and returns data. */
export function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}
