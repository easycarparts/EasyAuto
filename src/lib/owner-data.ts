// Owner-scoped reads (Step 1). These return data the public RLS policies hide
// (e.g. a user's own PENDING submissions). They use the service-role client but
// ALWAYS filter by the authenticated user's id passed in by the caller, so they
// never leak another owner's data. Call only from server code after requireUser().

import "server-only";
import { createSupabaseAdminClient } from "./supabase/admin";
import type { Business, BusinessMedia } from "./types";

export type ClaimRequestRow = {
  id: string;
  business_id: number;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  message: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
  decided_at: string | null;
};

export async function getOwnedBusinesses(userId: string): Promise<Business[]> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("businesses")
    .select("*")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false, nullsFirst: false });
  return (data as Business[] | null) ?? [];
}

// A single listing the user owns (or null if not theirs). The ownership check is
// the WHERE clause — a row for someone else simply isn't returned.
export async function getOwnedBusiness(
  userId: string,
  businessId: number,
): Promise<Business | null> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .eq("owner_id", userId)
    .maybeSingle();
  return (data as Business | null) ?? null;
}

export async function getMyClaims(userId: string): Promise<
  (ClaimRequestRow & { business: { slug: string; name: string } | null })[]
> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("claim_requests")
    .select("*, business:businesses(slug, name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as never) ?? [];
}

export async function getMediaForOwner(businessId: number): Promise<BusinessMedia[]> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("business_media")
    .select("*")
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data as BusinessMedia[] | null) ?? [];
}

export async function getCategorySlugs(businessId: number): Promise<string[]> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("business_categories")
    .select("category_slug")
    .eq("business_id", businessId);
  return ((data as { category_slug: string }[] | null) ?? []).map((r) => r.category_slug);
}
