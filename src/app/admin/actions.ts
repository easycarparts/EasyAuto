"use server";

// Admin moderation actions (Step 1). Every action re-verifies admin via
// requireAdmin() before touching data — server actions are public endpoints.

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchLiveGoogleReviews } from "@/lib/google-review-refresh";
import { syncBusinessGoogleReviews } from "@/lib/google-review-sync";
import { recomputeScore } from "@/lib/score";
import type { Business } from "@/lib/types";

export async function approveSubmission(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("businessId"));
  if (!id) return;
  const db = createSupabaseAdminClient();
  await db
    .from("businesses")
    .update({ status: "publish", updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function rejectSubmission(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("businessId"));
  if (!id) return;
  const db = createSupabaseAdminClient();
  await db.from("businesses").update({ status: "rejected" }).eq("id", id);
  revalidatePath("/admin");
}

export async function approveClaim(formData: FormData) {
  const admin = await requireAdmin();
  const claimId = String(formData.get("claimId") ?? "");
  if (!claimId) return;
  const db = createSupabaseAdminClient();

  const { data: claim } = await db
    .from("claim_requests")
    .select("*")
    .eq("id", claimId)
    .maybeSingle();
  if (!claim) return;

  const { data: biz } = await db
    .from("businesses")
    .select("*")
    .eq("id", claim.business_id)
    .maybeSingle();
  if (!biz) return;

  // Link the listing to the claimant, mark Verified, and bump the score (+trust).
  const { data: mediaRows } = await db
    .from("business_media")
    .select("kind")
    .eq("business_id", biz.id);
  const hasImage =
    Boolean((biz as Business).thumbnail_url) ||
    ((mediaRows as { kind: string }[] | null) ?? []).some((m) => m.kind === "image");
  const { easy_auto_score, score_breakdown } = recomputeScore(
    { ...(biz as Business), claimed: true },
    { hasImage },
  );

  await db
    .from("businesses")
    .update({
      owner_id: claim.user_id,
      claimed: true,
      easy_auto_score,
      score_breakdown,
      updated_at: new Date().toISOString(),
    })
    .eq("id", biz.id);

  const now = new Date().toISOString();
  await db
    .from("claim_requests")
    .update({ status: "approved", decided_by: admin.id, decided_at: now })
    .eq("id", claimId);

  // Reject any other pending claims on the same listing.
  await db
    .from("claim_requests")
    .update({ status: "rejected", decided_by: admin.id, decided_at: now })
    .eq("business_id", biz.id)
    .eq("status", "pending")
    .neq("id", claimId);

  revalidatePath("/admin");
  revalidatePath(`/business/${(biz as Business).slug}`);
}

export async function rejectClaim(formData: FormData) {
  const admin = await requireAdmin();
  const claimId = String(formData.get("claimId") ?? "");
  if (!claimId) return;
  const db = createSupabaseAdminClient();
  await db
    .from("claim_requests")
    .update({ status: "rejected", decided_by: admin.id, decided_at: new Date().toISOString() })
    .eq("id", claimId);
  revalidatePath("/admin");
}

export async function approveGoogleReviewRefresh(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return;

  const db = createSupabaseAdminClient();
  const { data: request } = await db
    .from("google_review_refresh_requests")
    .select("*")
    .eq("id", requestId)
    .eq("status", "pending")
    .maybeSingle();
  if (!request) return;

  const { data: biz } = await db
    .from("businesses")
    .select("*")
    .eq("id", request.business_id)
    .maybeSingle();
  if (!biz) return;

  const business = biz as Business;
  if (!business.claimed || !business.owner_id) return;

  const fetched = await fetchLiveGoogleReviews(business);
  if ("error" in fetched) {
    throw new Error(fetched.error);
  }

  const updates: Partial<Business> & { updated_at: string } = {
    rating: fetched.rating,
    google_reviews: fetched.reviewCount,
    updated_at: new Date().toISOString(),
  };
  if (!business.place_id) updates.place_id = fetched.placeId;

  const { error: updateError } = await db.from("businesses").update(updates).eq("id", business.id);
  if (updateError) throw new Error(updateError.message);

  await syncBusinessGoogleReviews(db, business.id, fetched.reviews);

  const now = new Date().toISOString();
  await db
    .from("google_review_refresh_requests")
    .update({ status: "approved", decided_by: admin.id, decided_at: now })
    .eq("id", requestId);

  revalidatePath("/admin");
  revalidatePath(`/business/${business.slug}`);
  revalidatePath(`/dashboard/business/${business.id}`);
}

const LEAD_STATUS_VALUES = new Set(["new", "contacted", "won", "lost"]);

export async function updateLeadStatus(formData: FormData) {
  await requireAdmin();
  const leadId = String(formData.get("leadId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!leadId || !LEAD_STATUS_VALUES.has(status)) return;
  const db = createSupabaseAdminClient();
  await db.from("leads").update({ status }).eq("id", leadId);
  revalidatePath("/admin");
}

export async function rejectGoogleReviewRefresh(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return;
  const db = createSupabaseAdminClient();
  await db
    .from("google_review_refresh_requests")
    .update({
      status: "rejected",
      decided_by: admin.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending");
  revalidatePath("/admin");
}
