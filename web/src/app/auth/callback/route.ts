import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/env";

/**
 * Google OAuth callback. Supabase redirects here with a `code`, which we
 * exchange for a session. We then enforce owner-only access: any non-owner
 * Google account is immediately signed out and rejected.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isOwnerEmail(user?.email)) {
    // Wrong Google account — destroy the session and reject.
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_owner`);
  }

  return NextResponse.redirect(`${origin}/`);
}
