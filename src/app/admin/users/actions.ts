"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Grant or revoke admin. Re-checks requireAdmin() (defence in depth) before the
// write, and won't let an admin remove their own access (avoids locking out).
export async function setUserAdmin(formData: FormData) {
  const me = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const makeAdmin = String(formData.get("makeAdmin") ?? "") === "true";
  if (!userId) return;
  if (userId === me.id && !makeAdmin) return; // don't self-demote

  const db = createSupabaseAdminClient();
  await db.from("profiles").update({ is_admin: makeAdmin }).eq("id", userId);
  revalidatePath("/admin/users");
}
