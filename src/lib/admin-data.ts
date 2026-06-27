// Admin reads (Step 1). Service-role queries — call ONLY after requireAdmin().

import "server-only";
import { createSupabaseAdminClient } from "./supabase/admin";
import type { Business } from "./types";

export async function getPendingSubmissions(): Promise<Business[]> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("businesses")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false, nullsFirst: false });
  return (data as Business[] | null) ?? [];
}

export type PendingClaim = {
  id: string;
  business_id: number;
  user_id: string;
  message: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
  business: { slug: string; name: string } | null;
  profile: { email: string | null } | null;
};

export async function getPendingClaims(): Promise<PendingClaim[]> {
  const db = createSupabaseAdminClient();
  // `profiles!user_id` disambiguates: claim_requests has two FKs to profiles
  // (user_id and decided_by), so an unqualified embed errors.
  const { data, error } = await db
    .from("claim_requests")
    .select("*, business:businesses(slug, name), profile:profiles!user_id(email)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getPendingClaims: ${error.message}`);
  return (data as never) ?? [];
}

export type LeadRow = {
  id: string;
  created_at: string;
  business_id: number | null;
  category_slug: string | null;
  city: string | null;
  action: string | null;
  routed_to: string | null;
  source: string | null;
};

export async function getRecentLeads(limit = 50): Promise<LeadRow[]> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("leads")
    .select("id, created_at, business_id, category_slug, city, action, routed_to, source")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as LeadRow[] | null) ?? [];
}
