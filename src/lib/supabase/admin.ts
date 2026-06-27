// Service-role Supabase client (Step 1 auth). Bypasses RLS — use ONLY in trusted
// server code (admin approvals, lead reads). Never import this into a client
// component; the service_role key must never reach the browser.

import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase service-role env vars for admin client.");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
