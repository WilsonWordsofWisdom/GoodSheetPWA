import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// A no-op-safe singleton. If env is missing (e.g. offline-only build), callers
// must guard with isSupabaseConfigured() before using the client.
export const isSupabaseConfigured = (): boolean => Boolean(url && anonKey);

export const supabase = createClient(url ?? "http://localhost", anonKey ?? "public-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
