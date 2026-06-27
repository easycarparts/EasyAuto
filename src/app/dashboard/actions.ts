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
import { recomputeScore } from "@/lib/score";
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

async function syncCategories(db: AdminDb, businessId: number, categories: string[]) {
  await db.from("business_categories").delete().eq("business_id", businessId);
  if (categories.length) {
    await db
      .from("business_categories")
      .insert(categories.map((c) => ({ business_id: businessId, category_slug: c })));
  }
}

// --- submit a new (pending) business --------------------------------------
export async function submitBusiness(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser("/dashboard/submit");
  const name = field(formData, "name");
  if (!name || name.length < 2) return { error: "Please enter the business name." };

  const categories = formData.getAll("categories").map(String).filter(Boolean);
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
      hours: field(formData, "hours"),
      category_slug: categories[0] ?? null,
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
  const updates = {
    description: field(formData, "description"),
    address: field(formData, "address"),
    city: field(formData, "city"),
    phone: field(formData, "phone"),
    email: field(formData, "email"),
    website: normaliseUrl(field(formData, "website")),
    hours: field(formData, "hours"),
    category_slug: categories[0] ?? existing.category_slug,
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

  await db.from("business_media").delete().eq("id", mediaId);

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
