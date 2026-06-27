// Auth data-access layer (Step 1). Centralises "who is the current user, and what
// may they do" so server components, actions and route handlers all check the same
// way. Follows the Next.js auth guide: verify close to the data, memoise per render.

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./supabase/server";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  is_admin: boolean;
};

// The authenticated user (or null). `getUser()` validates the token with Supabase,
// so it's safe to trust — unlike reading the session cookie directly.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

// The user's profile row (auto-created by a DB trigger on signup). Falls back to a
// minimal non-admin profile if the row hasn't materialised yet.
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return (
    (data as Profile | null) ?? {
      id: user.id,
      email: user.email ?? null,
      full_name: null,
      is_admin: false,
    }
  );
});

// Redirect to login (preserving where they were headed) if not signed in.
export async function requireUser(nextPath?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const suffix = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${suffix}`);
  }
  return user;
}

export async function isAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return Boolean(profile?.is_admin);
}

// Gate an admin-only route. Non-admins are sent home (no leaking that it exists).
export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile?.is_admin) redirect("/");
  return profile;
}
