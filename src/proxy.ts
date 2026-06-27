// Session refresh (Next 16 Proxy — formerly Middleware). Keeps the Supabase auth
// cookies fresh on the routes where being logged in matters: the owner dashboard,
// the admin area, and the auth flow itself. Scoped via `matcher` so it does NOT
// run on the thousands of static public directory pages (perf).
//
// This is an optimistic refresh only — real authorization lives in the data
// layer / server actions (see src/lib/auth.ts), per the Next.js auth guide.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touch the user to trigger a token refresh when needed.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/auth/:path*"],
};
