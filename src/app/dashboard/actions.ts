"use server";

// Owner mutations (Step 1). Every action verifies the signed-in user owns the
// target row BEFORE writing, then uses the service-role client for the constrained
// write — so owners can only change whitelisted fields on their own listings, and
// can never self-publish or set featured/score directly.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOwnedBusiness, getMediaForOwner } from "@/lib/owner-data";
import { parseGoogleMapsUrl } from "@/lib/parse-google-maps-url";
import { MAX_FEATURED_GOOGLE_REVIEWS } from "@/lib/google-review-policy";
import { resolvePlaceId } from "@/lib/google-review-refresh";
import { recomputeScore } from "@/lib/score";
import { socialLinksFromForm } from "@/lib/social-links";
import type { Business } from "@/lib/types";

export type FormResult = { error?: string; ok?: boolean };

// --- helpers ---------------------------------------------------------------
function field(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

function normaliseUrl(url: string | null): string | null {
  if (!url || url === "#") return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "business"
  );
}

type AdminDb = ReturnType<typeof createSupabaseAdminClient>;

async function uniqueSlug(db: AdminDb, base: string): Promise<string> {
  let slug = base;
  let i = 1;
  // Bounded loop — slugs collide rarely; bail after a sane number of tries.
  while (i < 50) {
    const { data } = await db.from("businesses").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

function geoFromForm(
  formData: FormData,
  existing?: Business | null,
): ParsedGeo | FormResult | { skip: true } {
  const raw = field(formData, "googleMapsLink");
  if (!raw) {
    if (existing?.latitude != null || existing?.google_link) return { skip: true };
    return { clear: true };
  }
  const parsed = parseGoogleMapsUrl(raw);
  if (!parsed) return { clear: true };
  if ("error" in parsed) return { error: parsed.error };
  return parsed;
}

type ParsedGeo =
  | { clear: true }
  | {
      latitude: number;
      longitude: number;
      place_id: string | null;
      google_link: string;
    };

function geoPatch(geo: ParsedGeo) {
  if ("clear" in geo) {
    return {
      latitude: null,
      longitude: null,
      place_id: null,
      google_link: null,
    };
  }
  return {
    latitude: geo.latitude,
    longitude: geo.longitude,
    place_id: geo.place_id,
    google_link: geo.google_link,
  };
}

async function syncCategories(db: AdminDb, businessId: number, categories: string[]) {
  await db.from("business_categories").delete().eq("business_id", businessId);
  if (categories.length) {
    await db
      .from("business_categories")
      .insert(categories.map((c) => ({ business_id: businessId, category_slug: c })));
  }
}

function resolvePrimaryCategory(
  formData: FormData,
  categories: string[],
  fallback?: string | null,
): string | null {
  const primary = field(formData, "primaryCategory");
  if (categories.length === 0) return primary ?? fallback ?? null;
  if (primary && categories.includes(primary)) return primary;
  if (fallback && categories.includes(fallback)) return fallback;
  return categories[0] ?? null;
}

// --- submit a new (pending) business --------------------------------------
export async function submitBusiness(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser("/dashboard/submit");
  const name = field(formData, "name");
  if (!name || name.length < 2) return { error: "Please enter the business name." };

  const categories = formData.getAll("categories").map(String).filter(Boolean);
  const primaryCategory = resolvePrimaryCategory(formData, categories);
  const geo = geoFromForm(formData);
  if ("error" in geo && geo.error) return { error: geo.error };
  const geoFields = "skip" in geo ? {} : geoPatch(geo as ParsedGeo);

  const db = createSupabaseAdminClient();
  const slug = await uniqueSlug(db, slugify(name));
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("businesses")
    .insert({
      slug,
      name,
      description: field(formData, "description"),
      address: field(formData, "address"),
      city: field(formData, "city"),
      phone: field(formData, "phone"),
      email: field(formData, "email"),
      website: normaliseUrl(field(formData, "website")),
      social_links: socialLinksFromForm(formData.entries()),
      hours: field(formData, "hours"),
      ...geoFields,
      category_slug: primaryCategory,
      owner_id: user.id,
      claimed: true, // owner submitted it themselves
      status: "pending", // awaits admin approval before going public
      country: "United Arab Emirates",
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  await syncCategories(db, data.id as number, categories);

  revalidatePath("/dashboard");
  redirect("/dashboard?submitted=1");
}

// --- edit an existing owned listing ---------------------------------------
export async function updateBusiness(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const id = Number(formData.get("businessId"));
  if (!id) return { error: "Missing business reference." };

  const db = createSupabaseAdminClient();
  const existing = await getOwnedBusiness(user.id, id);
  if (!existing) return { error: "You don't have access to this listing." };

  const categories = formData.getAll("categories").map(String).filter(Boolean);
  const primaryCategory = resolvePrimaryCategory(formData, categories, existing.category_slug);
  const geo = geoFromForm(formData, existing);
  if ("error" in geo && geo.error) return { error: geo.error };

  const updates = {
    description: field(formData, "description"),
    address: field(formData, "address"),
    city: field(formData, "city"),
    phone: field(formData, "phone"),
    email: field(formData, "email"),
    website: normaliseUrl(field(formData, "website")),
    social_links: socialLinksFromForm(formData.entries()),
    hours: field(formData, "hours"),
    ...("skip" in geo ? {} : geoPatch(geo as ParsedGeo)),
    category_slug: primaryCategory,
    updated_at: new Date().toISOString(),
  };

  const media = await getMediaForOwner(id);
  const hasImage = Boolean(existing.thumbnail_url) || media.some((m) => m.kind === "image");
  const merged = { ...existing, ...updates } as Business;
  const { easy_auto_score, score_breakdown } = recomputeScore(merged, { hasImage });

  const { error } = await db
    .from("businesses")
    .update({ ...updates, easy_auto_score, score_breakdown })
    .eq("id", id);
  if (error) return { error: error.message };

  await syncCategories(db, id, categories);

  revalidatePath(`/business/${existing.slug}`);
  revalidatePath(`/dashboard/business/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

// --- Google review refresh (owner requests; admin approves & runs API) -------
export async function requestGoogleReviewRefresh(businessId: number): Promise<FormResult> {
  const user = await requireUser();
  if (!businessId) return { error: "Missing business reference." };

  const db = createSupabaseAdminClient();
  const business = await getOwnedBusiness(user.id, businessId);
  if (!business) return { error: "You don't have access to this listing." };
  if (!business.claimed) {
    return { error: "Only claimed listings can request a Google review refresh." };
  }
  if (!resolvePlaceId(business)) {
    return {
      error:
        "Save a Google Maps link in your listing first so we can match your business on Google.",
    };
  }

  const { data: pending } = await db
    .from("google_review_refresh_requests")
    .select("id")
    .eq("business_id", businessId)
    .eq("status", "pending")
    .maybeSingle();
  if (pending) return { error: "You already have a refresh request awaiting admin approval." };

  const { error } = await db.from("google_review_refresh_requests").insert({
    business_id: businessId,
    user_id: user.id,
    status: "pending",
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/business/${businessId}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateFeaturedGoogleReviews(
  businessId: number,
  reviewIds: string[],
): Promise<FormResult> {
  const user = await requireUser();
  if (!businessId) return { error: "Missing business reference." };
  if (reviewIds.length > MAX_FEATURED_GOOGLE_REVIEWS) {
    return { error: `Choose at most ${MAX_FEATURED_GOOGLE_REVIEWS} reviews.` };
  }

  const db = createSupabaseAdminClient();
  const business = await getOwnedBusiness(user.id, businessId);
  if (!business) return { error: "You don't have access to this listing." };
  if (!business.claimed) {
    return { error: "Only claimed listings can feature Google reviews." };
  }

  const { data: owned } = await db
    .from("business_google_reviews")
    .select("id")
    .eq("business_id", businessId);
  const ownedIds = new Set(((owned as { id: string }[] | null) ?? []).map((r) => r.id));
  if (reviewIds.some((id) => !ownedIds.has(id))) {
    return { error: "Invalid review selection." };
  }

  await db.from("business_google_reviews").update({ featured: false }).eq("business_id", businessId);
  if (reviewIds.length > 0) {
    const { error } = await db
      .from("business_google_reviews")
      .update({ featured: true })
      .eq("business_id", businessId)
      .in("id", reviewIds);
    if (error) return { error: error.message };
  }

  revalidatePath(`/business/${business.slug}`);
  revalidatePath(`/dashboard/business/${businessId}`);
  return { ok: true };
}

// --- media (Cloudinary) ----------------------------------------------------
export async function addMedia(
  businessId: number,
  m: {
    url: string;
    kind: "image" | "video";
    public_id?: string | null;
    width?: number | null;
    height?: number | null;
    thumbnail_url?: string | null;
  },
): Promise<FormResult> {
  const user = await requireUser();
  const db = createSupabaseAdminClient();
  const biz = await getOwnedBusiness(user.id, businessId);
  if (!biz) return { error: "You don't have access to this listing." };
  if (!m.url) return { error: "Missing upload URL." };

  const existing = await getMediaForOwner(businessId);
  const { error } = await db.from("business_media").insert({
    business_id: businessId,
    url: m.url,
    kind: m.kind,
    public_id: m.public_id ?? null,
    width: m.width ?? null,
    height: m.height ?? null,
    thumbnail_url: m.thumbnail_url ?? null,
    sort_order: existing.length,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  // First uploaded image becomes the listing's main thumbnail if it has none.
  let thumbnail = biz.thumbnail_url;
  if (!thumbnail && m.kind === "image") {
    thumbnail = m.url;
    await db.from("businesses").update({ thumbnail_url: m.url }).eq("id", businessId);
  }

  const hasImage =
    Boolean(thumbnail) || m.kind === "image" || existing.some((x) => x.kind === "image");
  const { easy_auto_score, score_breakdown } = recomputeScore(
    { ...biz, thumbnail_url: thumbnail } as Business,
    { hasImage },
  );
  await db.from("businesses").update({ easy_auto_score, score_breakdown }).eq("id", businessId);

  revalidatePath(`/business/${biz.slug}`);
  revalidatePath(`/dashboard/business/${businessId}`);
  return { ok: true };
}

function preserveOriginalCover(biz: Business, nextUrl: string | null) {
  const patch: { thumbnail_url: string | null; original_thumbnail_url?: string } = {
    thumbnail_url: nextUrl,
  };
  if (!biz.original_thumbnail_url && biz.thumbnail_url && nextUrl !== biz.thumbnail_url) {
    patch.original_thumbnail_url = biz.thumbnail_url;
  }
  return patch;
}

export async function setCoverImage(businessId: number, url: string): Promise<FormResult> {
  const user = await requireUser();
  const db = createSupabaseAdminClient();
  const biz = await getOwnedBusiness(user.id, businessId);
  if (!biz) return { error: "You don't have access to this listing." };
  if (!url) return { error: "Missing image URL." };

  const gallery = await getMediaForOwner(businessId);
  if (!gallery.some((m) => m.kind === "image" && m.url === url)) {
    return { error: "Choose one of your uploaded photos as the cover image." };
  }

  const { error } = await db
    .from("businesses")
    .update(preserveOriginalCover(biz, url))
    .eq("id", businessId);
  if (error) return { error: error.message };

  const { easy_auto_score, score_breakdown } = recomputeScore(
    { ...biz, thumbnail_url: url } as Business,
    { hasImage: true },
  );
  await db.from("businesses").update({ easy_auto_score, score_breakdown }).eq("id", businessId);

  revalidatePath(`/business/${biz.slug}`);
  revalidatePath(`/dashboard/business/${businessId}`);
  return { ok: true };
}

export async function restoreCoverImage(businessId: number): Promise<FormResult> {
  const user = await requireUser();
  const db = createSupabaseAdminClient();
  const biz = await getOwnedBusiness(user.id, businessId);
  if (!biz) return { error: "You don't have access to this listing." };
  if (!biz.original_thumbnail_url) {
    return { error: "No original image is saved for this listing." };
  }
  if (biz.thumbnail_url === biz.original_thumbnail_url) return { ok: true };

  const { error } = await db
    .from("businesses")
    .update({ thumbnail_url: biz.original_thumbnail_url })
    .eq("id", businessId);
  if (error) return { error: error.message };

  const { easy_auto_score, score_breakdown } = recomputeScore(
    { ...biz, thumbnail_url: biz.original_thumbnail_url } as Business,
    { hasImage: true },
  );
  await db.from("businesses").update({ easy_auto_score, score_breakdown }).eq("id", businessId);

  revalidatePath(`/business/${biz.slug}`);
  revalidatePath(`/dashboard/business/${businessId}`);
  return { ok: true };
}

export async function deleteMedia(mediaId: string): Promise<FormResult> {
  const user = await requireUser();
  const db = createSupabaseAdminClient();
  const { data: media } = await db
    .from("business_media")
    .select("*")
    .eq("id", mediaId)
    .maybeSingle();
  if (!media) return { error: "Media not found." };

  const biz = await getOwnedBusiness(user.id, media.business_id as number);
  if (!biz) return { error: "You don't have access to this listing." };

  const deletedUrl = media.url as string;
  await db.from("business_media").delete().eq("id", mediaId);

  if (biz.thumbnail_url === deletedUrl) {
    const remaining = await getMediaForOwner(media.business_id as number);
    const nextCover = remaining.find((m) => m.kind === "image")?.url ?? null;
    await db.from("businesses").update({ thumbnail_url: nextCover }).eq("id", biz.id);

    const hasImage =
      Boolean(nextCover) || remaining.some((m) => m.kind === "image");
    const { easy_auto_score, score_breakdown } = recomputeScore(
      { ...biz, thumbnail_url: nextCover } as Business,
      { hasImage },
    );
    await db.from("businesses").update({ easy_auto_score, score_breakdown }).eq("id", biz.id);
  }

  revalidatePath(`/business/${biz.slug}`);
  revalidatePath(`/dashboard/business/${media.business_id}`);
  return { ok: true };
}

// --- delete a pending submission ------------------------------------------
// Only the owner can delete, and only while it's still PENDING — published
// directory listings are real content and must not be removable this way.
// FK cascades clean up the listing's categories, media and any claim rows.
export async function deleteSubmission(businessId: number): Promise<FormResult> {
  const user = await requireUser();
  if (!businessId) return { error: "Missing business reference." };

  const db = createSupabaseAdminClient();
  const biz = await getOwnedBusiness(user.id, businessId);
  if (!biz) return { error: "You don't have access to this listing." };
  if (biz.status !== "pending") {
    return { error: "Only pending submissions can be deleted." };
  }

  const { error } = await db
    .from("businesses")
    .delete()
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .eq("status", "pending");
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}

// --- claim an existing listing --------------------------------------------
export async function createClaim(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const slug = String(formData.get("slug") ?? "");
  const user = await requireUser(`/dashboard/claim/${slug}`);
  const db = createSupabaseAdminClient();

  const { data: biz } = await db
    .from("businesses")
    .select("id, owner_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!biz) return { error: "Business not found." };
  if (biz.owner_id) return { error: "This listing has already been claimed." };

  const { error } = await db.from("claim_requests").upsert(
    {
      business_id: biz.id,
      user_id: user.id,
      message: field(formData, "message"),
      contact_phone: field(formData, "contact_phone"),
      contact_email: field(formData, "contact_email"),
      status: "pending",
    },
    { onConflict: "business_id,user_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  redirect("/dashboard?claim=submitted");
}
