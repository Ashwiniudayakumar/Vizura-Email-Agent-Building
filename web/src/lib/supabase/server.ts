import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublic } from "@/lib/env";

/**
 * Server Supabase client bound to the request's cookies (anon key + RLS).
 * Next.js 16: `cookies()` is async, so this factory is async too.
 *
 * Use in Server Components, Route Handlers, and Server Actions. Session token
 * refresh for the browser is handled by `proxy.ts` (Next 16's renamed
 * middleware), so a failed `setAll` from a Server Component is safe to ignore.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabasePublic.url(), supabasePublic.anonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component where cookies are read-only.
          // proxy.ts refreshes the session, so this can be ignored.
        }
      },
    },
  });
}
