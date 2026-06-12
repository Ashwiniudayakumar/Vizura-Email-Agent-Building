import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/env";

/**
 * Data Access Layer for auth. `getCurrentUser` is memoized per request (React
 * cache) so multiple components can call it without repeat network round-trips.
 *
 * Always use `supabase.auth.getUser()` (not getSession) on the server — it
 * revalidates the token with Supabase rather than trusting the cookie.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Whether the current request is an authenticated owner. */
export async function isOwner(): Promise<boolean> {
  const user = await getCurrentUser();
  return isOwnerEmail(user?.email);
}

/**
 * Gate a Server Component / Action / Route Handler to the owner only.
 * Redirects to /login (unauthenticated) or /login?error=not_owner (wrong account).
 */
export async function requireOwner(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/login?error=not_owner");
  return user;
}
