"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedBusiness } from "@/lib/owner-data";
import { getPostForOwner } from "@/lib/owner-post-data";
import { blogIndexPath, postPublicPath } from "@/lib/post-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sanitizeOwnerHtml } from "@/lib/format";

export type PostFormResult = { error?: string; ok?: boolean };

function field(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "post"
  );
}

function boolField(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

type PostFields = {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  author_name: string | null;
  noindex: boolean;
  status: "draft" | "publish";
};

function readPostFields(formData: FormData): PostFields | { error: string } {
  const title = field(formData, "title");
  if (!title || title.length < 3) return { error: "Title must be at least 3 characters." };

  const slugRaw = field(formData, "slug");
  const slug = slugify(slugRaw || title);
  const status = field(formData, "status") === "publish" ? "publish" : "draft";

  return {
    title,
    slug,
    excerpt: field(formData, "excerpt"),
    content: sanitizeOwnerHtml(field(formData, "content") ?? ""),
    cover_image_url: field(formData, "coverImageUrl"),
    cover_image_alt: field(formData, "coverImageAlt"),
    meta_title: field(formData, "metaTitle"),
    meta_description: field(formData, "metaDescription"),
    og_image_url: field(formData, "ogImageUrl"),
    author_name: field(formData, "authorName"),
    noindex: boolField(formData, "noindex"),
    status,
  };
}

async function uniquePostSlug(
  db: ReturnType<typeof createSupabaseAdminClient>,
  businessId: number,
  base: string,
  excludeId?: string,
): Promise<string> {
  let slug = base;
  for (let i = 1; i < 50; i++) {
    let q = db.from("business_posts").select("id").eq("business_id", businessId).eq("slug", slug);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return slug;
    slug = `${base}-${i + 1}`;
  }
  return `${base}-${Date.now()}`;
}

function revalidatePostPaths(businessSlug: string, postSlug?: string) {
  revalidatePath(blogIndexPath(businessSlug));
  revalidatePath(`/business/${businessSlug}`);
  if (postSlug) revalidatePath(postPublicPath(businessSlug, postSlug));
  revalidatePath("/sitemap.xml");
}

export async function createPost(
  _prev: PostFormResult,
  formData: FormData,
): Promise<PostFormResult> {
  const user = await requireUser();
  const businessId = Number(formData.get("businessId"));
  if (!businessId) return { error: "Missing business reference." };

  const biz = await getOwnedBusiness(user.id, businessId);
  if (!biz) return { error: "You don't have access to this listing." };

  const raw = readPostFields(formData);
  if ("error" in raw) return raw;
  const fields = raw;

  const db = createSupabaseAdminClient();
  const slug = await uniquePostSlug(db, businessId, fields.slug);
  const now = new Date().toISOString();
  const published_at = fields.status === "publish" ? now : null;

  const { data, error } = await db
    .from("business_posts")
    .insert({
      business_id: businessId,
      ...fields,
      slug,
      published_at,
      created_by: user.id,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePostPaths(biz.slug, slug);
  revalidatePath(`/dashboard/business/${businessId}/blog`);
  redirect(`/dashboard/business/${businessId}/blog/${data.id as string}?saved=1`);
}

export async function updatePost(
  _prev: PostFormResult,
  formData: FormData,
): Promise<PostFormResult> {
  const user = await requireUser();
  const businessId = Number(formData.get("businessId"));
  const postId = String(formData.get("postId") ?? "");
  if (!businessId || !postId) return { error: "Missing post reference." };

  const biz = await getOwnedBusiness(user.id, businessId);
  if (!biz) return { error: "You don't have access to this listing." };

  const existing = await getPostForOwner(businessId, postId);
  if (!existing) return { error: "Post not found." };

  const raw = readPostFields(formData);
  if ("error" in raw) return raw;
  const fields = raw;

  const db = createSupabaseAdminClient();
  const slug =
    fields.slug === existing.slug
      ? existing.slug
      : await uniquePostSlug(db, businessId, fields.slug, postId);

  const now = new Date().toISOString();
  const published_at =
    fields.status === "publish"
      ? existing.published_at ?? now
      : null;

  const { error } = await db
    .from("business_posts")
    .update({
      ...fields,
      slug,
      published_at,
      updated_at: now,
    })
    .eq("id", postId)
    .eq("business_id", businessId);

  if (error) return { error: error.message };

  revalidatePostPaths(biz.slug, slug);
  if (existing.slug !== slug) revalidatePostPaths(biz.slug, existing.slug);
  revalidatePath(`/dashboard/business/${businessId}/blog`);
  revalidatePath(`/dashboard/business/${businessId}/blog/${postId}`);
  return { ok: true };
}

export async function deletePost(businessId: number, postId: string): Promise<PostFormResult> {
  const user = await requireUser();
  const biz = await getOwnedBusiness(user.id, businessId);
  if (!biz) return { error: "You don't have access to this listing." };

  const existing = await getPostForOwner(businessId, postId);
  if (!existing) return { error: "Post not found." };

  const db = createSupabaseAdminClient();
  const { error } = await db
    .from("business_posts")
    .delete()
    .eq("id", postId)
    .eq("business_id", businessId);
  if (error) return { error: error.message };

  revalidatePostPaths(biz.slug, existing.slug);
  revalidatePath(`/dashboard/business/${businessId}/blog`);
  return { ok: true };
}
