import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser/server-safe client using the publishable (anon) key. Reads are guarded
// by Row Level Security policies (see supabase/schema.sql).
//
// Built LAZILY: constructing at module load (and throwing on missing env) makes
// the whole module graph fail to evaluate during `next build` page-data
// collection — even for pages like /_not-found that never query Supabase. The
// Proxy defers creation (and the env-var check) to the first actual use, so a
// missing env var surfaces at request time with a clear error, not at build.

let client: SupabaseClient | null = null;

// True when the public Supabase env vars are present. Build-time data readers
// use this to degrade gracefully (return empty) instead of crashing the build
// when an environment hasn't been given the vars — e.g. a Vercel Preview deploy
// scoped to Production-only env. Runtime reads still surface a clear error.
export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Copy .env.example to .env.local and fill in the values.",
    );
  }
  client = createClient(url, anonKey);
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getClient(), prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
