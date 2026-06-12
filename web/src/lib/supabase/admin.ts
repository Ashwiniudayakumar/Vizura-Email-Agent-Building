import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv, supabasePublic } from "@/lib/env";

/**
 * Service-role Supabase client. Bypasses RLS — SERVER ONLY.
 * Use for ingestion and privileged writes (never expose to the browser).
 */
export function createAdminClient() {
  return createClient(supabasePublic.url(), serverEnv.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
