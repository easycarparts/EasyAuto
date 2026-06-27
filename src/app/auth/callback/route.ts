// OAuth + magic-link landing. Supabase redirects here after the user authenticates.
// OAuth and PKCE flows arrive with `?code`; email OTP links may arrive with
// `?token_hash&type`. We exchange that for a session (sets the auth cookies via the
// server client), then forward the user to their intended destination.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const store = await cookies();

  // Destination: ?next= (back-compat) → ea-next cookie → dashboard. Must be a
  // local path to avoid open redirects.
  const fromQuery = searchParams.get("next");
  const fromCookie = store.get("ea-next")?.value;
  const candidate =
    (fromQuery && decodeURIComponent(fromQuery)) ||
    (fromCookie && decodeURIComponent(fromCookie)) ||
    "/dashboard";
  const next = candidate.startsWith("/") ? candidate : "/dashboard";

  const supabase = await createSupabaseServerClient();

  let failed = true;
  let message = "No sign-in code was provided.";
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
    if (error) message = error.message;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    failed = Boolean(error);
    if (error) message = error.message;
  }

  // Clear the destination cookie either way.
  store.set("ea-next", "", { maxAge: 0, path: "/" });

  const dest = failed
    ? `${origin}/login?error=${encodeURIComponent(message)}`
    : `${origin}${next}`;
  return NextResponse.redirect(dest);
}
