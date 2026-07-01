// Magic-link landing (+ OAuth if enabled later). Supabase redirects here after the user
// authenticates. PKCE flows arrive with `?code`; email OTP links may arrive with
// `?token_hash&type`. We exchange that for a session (sets the auth cookies via the
// server client), then forward the user to their intended destination.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Record an auth completion into analytics_events. Fires here (not the client)
// so Google sign-ins and clicked email links — which never touch the login
// form — still show up in the dashboard's auth funnel. No browser session id is
// available server-side, so the event isn't linked to a visitor journey; it
// still counts by name.
async function recordAuth(user: User | null | undefined, method: string, type: EmailOtpType | null) {
  if (!user) return;
  let name: string;
  if (type === "signup") name = "signup_completed";
  else if (type === "recovery") name = "password_reset_completed";
  else {
    // OAuth / magic-link: first sign-in ≈ created_at == last_sign_in_at.
    const created = new Date(user.created_at).getTime();
    const last = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : created;
    name = Math.abs(last - created) < 10_000 ? "signup_completed" : "login_completed";
  }
  try {
    await createSupabaseAdminClient()
      .from("analytics_events")
      .insert({ id: crypto.randomUUID(), name, category: "auth", props: { method }, path: "/auth/callback" });
  } catch {
    /* never block sign-in on tracking */
  }
}

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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
    if (error) message = error.message;
    else await recordAuth(data.user, data.user?.app_metadata?.provider ?? "oauth", null);
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    failed = Boolean(error);
    if (error) message = error.message;
    else await recordAuth(data.user, "email_link", type);
  }

  // Clear the destination cookie either way.
  store.set("ea-next", "", { maxAge: 0, path: "/" });

  const dest = failed
    ? `${origin}/login?error=${encodeURIComponent(message)}`
    : `${origin}${next}`;
  return NextResponse.redirect(dest);
}
