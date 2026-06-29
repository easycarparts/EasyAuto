// Public reads for owner-authored business blog posts.

import { cache } from "react";
import { supabase } from "./supabase";
import type { BusinessPost } from "./types";

export function postPublicPath(businessSlug: string, postSlug: string): string {
  return `/business/${businessSlug}/blog/${postSlug}`;
}

export function blogIndexPath(businessSlug: string): string {
  return `/business/${businessSlug}/blog`;
}

async function publishedBusinessSlugMap(): Promise<Map<number, string>> {
  const { data: posts, error: postsErr } = await supabase
    .from("business_posts")
    .select("business_id")
    .eq("status", "publish");
  if (postsErr) throw new Error(postsErr.message);

  const ids = [...new Set((posts ?? []).map((p) => p.business_id as number))];
  if (ids.length === 0) return new Map();

  const { data: businesses, error: bizErr } = await supabase
    .from("businesses")
    .select("id, slug")
    .in("id", ids)
    .eq("status", "publish");
  if (bizErr) throw new Error(bizErr.message);

  return new Map((businesses ?? []).map((b) => [b.id as number, b.slug as string]));
}

export const getPublishedPostsForBusiness = cache(async (businessId: number): Promise<BusinessPost[]> => {
  const { data, error } = await supabase
    .from("business_posts")
    .select("*")
    .eq("business_id", businessId)
    .eq("status", "publish")
    .order("published_at", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as BusinessPost[]) ?? [];
});

export const getPublishedPost = cache(
  async (businessId: number, postSlug: string): Promise<BusinessPost | null> => {
    const { data, error } = await supabase
      .from("business_posts")
      .select("*")
      .eq("business_id", businessId)
      .eq("slug", postSlug)
      .eq("status", "publish")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as BusinessPost | null) ?? null;
  },
);

export async function getAllPublishedPostParams(): Promise<{ slug: string; postSlug: string }[]> {
  const bizMap = await publishedBusinessSlugMap();
  if (bizMap.size === 0) return [];

  const { data, error } = await supabase
    .from("business_posts")
    .select("slug, business_id")
    .eq("status", "publish");
  if (error) throw new Error(error.message);

  return ((data as { slug: string; business_id: number }[]) ?? [])
    .filter((r) => bizMap.has(r.business_id))
    .map((r) => ({ slug: bizMap.get(r.business_id)!, postSlug: r.slug }));
}

export async function getBusinessSlugsWithBlog(): Promise<string[]> {
  const bizMap = await publishedBusinessSlugMap();
  return [...bizMap.values()];
}

export async function getAllPublishedPostsForSitemap(): Promise<
  { businessSlug: string; postSlug: string; updated_at: string }[]
> {
  const bizMap = await publishedBusinessSlugMap();
  if (bizMap.size === 0) return [];

  const { data, error } = await supabase
    .from("business_posts")
    .select("slug, business_id, updated_at")
    .eq("status", "publish");
  if (error) throw new Error(error.message);

  return ((data as { slug: string; business_id: number; updated_at: string }[]) ?? [])
    .filter((r) => bizMap.has(r.business_id))
    .map((r) => ({
      businessSlug: bizMap.get(r.business_id)!,
      postSlug: r.slug,
      updated_at: r.updated_at,
    }));
}

export type BusinessPostFeedRow = {
  post: BusinessPost;
  business: {
    id: number;
    slug: string;
    name: string;
    city: string | null;
    category_slug: string | null;
    address: string | null;
    claimed: boolean;
    status: string;
  };
};

export const getPublishedBusinessPostsForFeed = cache(async (): Promise<BusinessPostFeedRow[]> => {
  const { data, error } = await supabase
    .from("business_posts")
    .select(
      "*, business:businesses!inner(id, slug, name, city, category_slug, address, claimed, status)",
    )
    .eq("status", "publish");
  if (error) throw new Error(error.message);

  return ((data as (BusinessPost & { business: BusinessPostFeedRow["business"] })[]) ?? [])
    .filter((row) => row.business?.status === "publish")
    .map((row) => {
      const { business, ...post } = row;
      return { post, business };
    });
});
