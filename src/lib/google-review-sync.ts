import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { GooglePlaceReview } from "./google-places";
import { MAX_FEATURED_GOOGLE_REVIEWS } from "./google-review-policy";

type AdminDb = ReturnType<typeof createSupabaseAdminClient>;

export async function syncBusinessGoogleReviews(
  db: AdminDb,
  businessId: number,
  reviews: GooglePlaceReview[],
): Promise<void> {
  const { data: existing } = await db
    .from("business_google_reviews")
    .select("google_review_id, featured")
    .eq("business_id", businessId);

  const previouslyFeatured = new Set(
    ((existing as { google_review_id: string; featured: boolean }[] | null) ?? [])
      .filter((r) => r.featured)
      .map((r) => r.google_review_id),
  );

  await db.from("business_google_reviews").delete().eq("business_id", businessId);

  if (reviews.length === 0) return;

  const now = new Date().toISOString();
  let featuredUsed = 0;
  const rows = reviews.map((r, i) => {
    let featured = previouslyFeatured.has(r.googleReviewId);
    if (featured && featuredUsed >= MAX_FEATURED_GOOGLE_REVIEWS) featured = false;
    if (featured) featuredUsed += 1;
    return {
      business_id: businessId,
      google_review_id: r.googleReviewId,
      author_name: r.authorName,
      author_photo_url: r.authorPhotoUrl,
      author_uri: r.authorUri,
      rating: r.rating,
      text: r.text,
      relative_time: r.relativeTime,
      published_at: r.publishedAt,
      featured,
      sort_order: i,
      fetched_at: now,
    };
  });

  await db.from("business_google_reviews").insert(rows);
}
