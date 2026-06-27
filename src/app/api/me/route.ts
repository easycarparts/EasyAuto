// Lightweight auth-state endpoint for the header nav. The SiteHeader lives in the
// root layout, so it must stay a client component (else every static page turns
// dynamic). Reading the session reliably requires the SERVER (the auth cookie may
// be HttpOnly), so the client header fetches this instead of reading cookies itself.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ loggedIn: false, isAdmin: false });
  }

  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json(
    { loggedIn: true, isAdmin: Boolean(data?.is_admin) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
