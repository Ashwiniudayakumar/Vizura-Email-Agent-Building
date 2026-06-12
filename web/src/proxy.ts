import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabasePublic, isOwnerEmail } from "@/lib/env";

/**
 * Next.js 16 "Proxy" (formerly Middleware). Runs on every matched request to:
 *   1. Refresh the Supabase auth token and sync cookies onto the response.
 *   2. Perform optimistic route gating (owner-only access).
 *
 * Optimistic only — real authorization is re-checked at the data source via
 * the DAL (`requireOwner`). Do not put slow DB calls here.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    supabasePublic.url(),
    supabasePublic.anonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/auth"); // OAuth callback etc.
  const isLogin = path === "/login";
  const owner = isOwnerEmail(user?.email);

  // Let the OAuth callback run regardless (it sets the session + checks owner).
  if (isAuthRoute) return response;

  // Not signed in and trying to reach a protected route -> login.
  if (!user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Signed in but not the owner -> bounce with an error (callback also enforces).
  if (user && !owner && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "not_owner");
    return NextResponse.redirect(url);
  }

  // Owner already signed in -> skip the login page.
  if (owner && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
