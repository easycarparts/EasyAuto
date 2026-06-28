import "server-only";
import { createSupabaseAdminClient } from "./supabase/admin";
import type { BusinessPost } from "./types";

export async function getPostsForOwner(businessId: number): Promise<BusinessPost[]> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("business_posts")
    .select("*")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });
  return (data as BusinessPost[]) ?? [];
}

export async function getPostForOwner(
  businessId: number,
  postId: string,
): Promise<BusinessPost | null> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("business_posts")
    .select("*")
    .eq("business_id", businessId)
    .eq("id", postId)
    .maybeSingle();
  return (data as BusinessPost | null) ?? null;
}
