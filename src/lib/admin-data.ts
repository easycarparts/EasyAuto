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
  service_slug: string | null;
  location_slug: string | null;
  city: string | null;
  action: string | null;
  lead_type: string | null;
  status: string | null;
  routed_to: string | null;
  source: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  business: { slug: string; name: string } | null;
};

export const LEAD_STATUSES = ["new", "contacted", "won", "lost"] as const;

export async function getRecentLeads(
  limit = 100,
  opts: { status?: string; formOnly?: boolean } = {},
): Promise<LeadRow[]> {
  const db = createSupabaseAdminClient();
  let q = db
    .from("leads")
    .select(
      "id, created_at, business_id, category_slug, service_slug, location_slug, city, action, lead_type, status, routed_to, source, name, phone, email, message, business:businesses(slug, name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts.status) q = q.eq("status", opts.status);
  // Form submissions are the captured contact leads (vs raw click events).
  if (opts.formOnly) q = q.eq("lead_type", "form");
  const { data } = await q;
  return (data as LeadRow[] | null) ?? [];
}

export type LeadCounts = { all: number; new: number; form: number };

export async function getLeadCounts(): Promise<LeadCounts> {
  const db = createSupabaseAdminClient();
  const head = { count: "exact" as const, head: true };
  const [all, fresh, form] = await Promise.all([
    db.from("leads").select("id", head),
    db.from("leads").select("id", head).eq("status", "new"),
    db.from("leads").select("id", head).eq("lead_type", "form"),
  ]);
  return { all: all.count ?? 0, new: fresh.count ?? 0, form: form.count ?? 0 };
}

export type PendingGoogleReviewRefresh = {
  id: string;
  business_id: number;
  created_at: string;
  business: {
    slug: string;
    name: string;
    rating: number | null;
    google_reviews: number | null;
    claimed: boolean;
  } | null;
  profile: { email: string | null } | null;
};

export async function getPendingGoogleReviewRefreshes(): Promise<PendingGoogleReviewRefresh[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("google_review_refresh_requests")
    .select(
      "id, business_id, created_at, business:businesses(slug, name, rating, google_reviews, claimed), profile:profiles!user_id(email)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getPendingGoogleReviewRefreshes: ${error.message}`);
  return (data as never) ?? [];
}
