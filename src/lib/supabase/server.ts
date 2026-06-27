// Cookie-bound Supabase client for Server Components, Server Actions and Route
// Handlers (Step 1 auth). Reads/writes the session cookies via next/headers so an
// authenticated user is recognised on the server. Separate from src/lib/supabase.ts,
// which stays the stateless anon read client used by the public data layer.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY).");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `set` throws when called from a Server Component (cookies are
          // read-only there). The proxy refreshes the session, so this is safe
          // to ignore — see src/proxy.ts.
        }
      },
    },
  });
}
