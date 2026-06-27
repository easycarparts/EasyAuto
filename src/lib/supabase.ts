import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase env vars. Copy .env.example to .env.local and fill in the values."
  );
}

/**
 * Browser/server-safe client using the publishable (anon) key.
 * Reads are guarded by Row Level Security policies (see supabase/schema.sql).
 */
export const supabase = createClient(url, anonKey);
