// =============================================================
// Supabase client — single instance, reads URL + anon key from
// APP_DATA_0.json. Used for auth + entitlements (subscription
// tier, coin balance, daily caps). Existing Firebase code is
// untouched for now; entitlements are the security boundary.
// =============================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import rootConfig from "../../../APP_DATA_0.json";

const cfg = (rootConfig as { supabase: { url: string; anonKey: string } }).supabase;

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  if (!cfg?.url || !cfg?.anonKey) {
    throw new Error("Supabase URL / anon key missing in APP_DATA_0.json");
  }
  _client = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: typeof window !== "undefined",
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}
