import { createBrowserClient } from "@supabase/ssr";
import { supabasePublic } from "@/lib/env";

/**
 * Browser Supabase client (anon key + RLS). Safe for client components.
 * Used for the Google OAuth sign-in flow.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabasePublic.url(), supabasePublic.anonKey());
}
