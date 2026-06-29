import { cache } from "react";
import { getAllNews } from "./data";
import { stripHtml, truncate } from "./format";
import { getPublishedBusinessPostsForFeed } from "./post-data";
import type { NewsPost } from "./types";

/** Minimum word count for a business blog to appear on /news and cross-links. */
export const MIN_BUSINESS_POST_WORDS = 400;

export type FeedItem = {
  id: string;
  kind: "editorial" | "business";
  title: string;
  excerpt: string;
  href: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  businessName?: string;
  businessSlug?: string;
  businessCity?: string | null;
  categorySlug?: string | null;
};

function wordCount(text: string | null | undefined): number {
  if (!text) return 0;
  const plain = stripHtml(text);
  if (!plain) return 0;
  return plain.split(/\s+/).filter(Boolean).length;
}

function blurb(title: string, excerpt: string | null, content: string | null): string {
  if (excerpt?.trim()) return excerpt.trim();
  if (content) return truncate(stripHtml(content), 160);
  return "";
}

function editorialItem(post: NewsPost): FeedItem {
  return {
    id: `news-${post.id}`,
    kind: "editorial",
    title: post.title,
    excerpt: blurb(post.title, post.excerpt, post.content),
    href: `/news/${post.slug}`,
    publishedAt: post.published_at,
    thumbnailUrl: post.thumbnail_url,
  };
}

function feedDate(iso: string | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

export const getMixedContentFeed = cache(async (): Promise<FeedItem[]> => {
  const [editorial, businessRows] = await Promise.all([
    getAllNews(),
    getPublishedBusinessPostsForFeed(),
  ]);

  const businessItems: FeedItem[] = businessRows
    .filter(({ post }) => {
      if (post.noindex) return false;
      const words = wordCount(post.content) + wordCount(post.excerpt);
      return words >= MIN_BUSINESS_POST_WORDS;
    })
    .map(({ post, business }) => ({
      id: `blog-${post.id}`,
      kind: "business" as const,
      title: post.title,
      excerpt: blurb(post.title, post.excerpt, post.content),
      href: `/business/${business.slug}/blog/${post.slug}`,
      publishedAt: post.published_at ?? post.created_at,
      thumbnailUrl: post.cover_image_url ?? post.og_image_url,
      businessName: business.name,
      businessSlug: business.slug,
      businessCity: business.city,
      categorySlug: business.category_slug,
    }));

  return [...editorial.map(editorialItem), ...businessItems].sort(
    (a, b) => feedDate(b.publishedAt) - feedDate(a.publishedAt),
  );
});

export async function getRecentContentFeed(limit: number): Promise<FeedItem[]> {
  const feed = await getMixedContentFeed();
  return feed.slice(0, limit);
}

export function findRelatedFeedItems(
  currentHref: string,
  feed: FeedItem[],
  opts: { categorySlug?: string | null; limit?: number } = {},
): FeedItem[] {
  const limit = opts.limit ?? 3;
  const current = feed.find((f) => f.href === currentHref);
  const pool = feed.filter((f) => f.href !== currentHref);

  const titleTokens = new Set(
    (current?.title ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3),
  );

  const scored = pool.map((item) => {
    let score = 0;
    if (opts.categorySlug && item.categorySlug === opts.categorySlug) score += 4;
    if (item.kind === current?.kind) score += 1;
    const tokens = item.title.toLowerCase().split(/[^a-z0-9]+/);
    for (const t of tokens) {
      if (t.length > 3 && titleTokens.has(t)) score += 2;
    }
    return { item, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || feedDate(b.item.publishedAt) - feedDate(a.item.publishedAt))
    .filter((s) => s.score > 0)
    .slice(0, limit)
    .map((s) => s.item);
}
