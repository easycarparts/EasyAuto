"use client";

// Browser Supabase client (Step 1 auth) — used by client components that need to
// kick off OAuth / magic-link sign-in. Session cookies are shared with the server
// client via @supabase/ssr.

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(url, anonKey);
}
