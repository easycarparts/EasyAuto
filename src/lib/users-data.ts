// Admin user directory. Reads the auth users via the service-role admin API
// (all the profile data Google/email give us: name, avatar, provider, sign-in
// times) and enriches with is_admin + how many listings each user owns. Call
// ONLY after requireAdmin().

import "server-only";
import { createSupabaseAdminClient } from "./supabase/admin";

export type AdminUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  providers: string[];
  emailConfirmed: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  isAdmin: boolean;
  ownedCount: number;
};

export async function getUsers(): Promise<AdminUser[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  const users = data?.users ?? [];
  const ids = users.map((u) => u.id);

  const [{ data: profiles }, { data: owned }] = await Promise.all([
    db.from("profiles").select("id, is_admin").in("id", ids.length ? ids : ["-"]),
    db.from("businesses").select("owner_id").in("owner_id", ids.length ? ids : ["-"]),
  ]);
  const adminSet = new Set((profiles ?? []).filter((p) => p.is_admin).map((p) => p.id));
  const ownCount: Record<string, number> = {};
  for (const b of owned ?? []) {
    const oid = (b as { owner_id: string | null }).owner_id;
    if (oid) ownCount[oid] = (ownCount[oid] ?? 0) + 1;
  }

  return users
    .map((u): AdminUser => {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const app = (u.app_metadata ?? {}) as Record<string, unknown>;
      const providers =
        Array.isArray(app.providers) && app.providers.length
          ? (app.providers as string[])
          : typeof app.provider === "string"
            ? [app.provider]
            : [];
      // Google's OIDC claims mean it was a Google sign-in even if app_metadata
      // lists 'email' first — surface it so the provider column is truthful.
      const looksGoogle =
        Boolean(meta.picture || meta.avatar_url) || String(meta.iss ?? "").includes("google");
      if (looksGoogle && !providers.includes("google")) providers.push("google");

      return {
        id: u.id,
        email: u.email ?? null,
        name: (meta.full_name as string) ?? (meta.name as string) ?? null,
        avatar: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
        providers,
        emailConfirmed: Boolean(u.email_confirmed_at),
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        isAdmin: adminSet.has(u.id),
        ownedCount: ownCount[u.id] ?? 0,
      };
    })
    .sort((a, b) => (b.lastSignInAt ?? b.createdAt).localeCompare(a.lastSignInAt ?? a.createdAt));
}
