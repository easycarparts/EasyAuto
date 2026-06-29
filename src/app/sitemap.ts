import type { MetadataRoute } from "next";
import {
  getAllBusinessSlugs,
  getAllCategories,
  getAllNews,
  getLocationFacets,
} from "@/lib/data";
import { getAllPublishedPostsForSitemap, getBusinessSlugsWithBlog } from "@/lib/post-data";
import { SERVICE_GROUPS } from "@/lib/taxonomy";
import { computeLocationCombos } from "@/lib/location-combos";
import { nearMeSlugs } from "@/lib/near-me";
import { brandSlugs } from "@/lib/brands";
import { guideSlugs } from "@/lib/guides";
import { absoluteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [bizSlugs, categories, news, facets, blogPosts, blogIndexes] = await Promise.all([
    getAllBusinessSlugs(),
    getAllCategories(),
    getAllNews(),
    getLocationFacets(),
    getAllPublishedPostsForSitemap(),
    getBusinessSlugsWithBlog(),
  ]);

  const topCats = new Set(categories.slice(0, 15).map((c) => c.slug));
  const combos = computeLocationCombos(facets, topCats, 3);
  const entry = (path: string): MetadataRoute.Sitemap[number] => ({ url: absoluteUrl(path) });

  return [
    { url: absoluteUrl("/"), priority: 1 },
    entry("/news"),
    entry("/submit-business"),
    entry("/claim-business"),
    entry("/business"),
    entry("/map"),
    // P3 — "[service] near me" landing pages
    ...nearMeSlugs().map((s) => entry(`/${s}`)),
    // P4 — brand pages + guide cluster
    entry("/brands"),
    ...brandSlugs().map((s) => entry(`/brands/${s}`)),
    entry("/guides"),
    ...guideSlugs().map((s) => entry(`/guides/${s}`)),
    // Service-group hubs + raw category pages
    ...SERVICE_GROUPS.map((g) => entry(`/business-category/${g.slug}`)),
    ...categories.map((c) => entry(`/business-category/${c.slug}`)),
    // Programmatic location pages
    ...combos.map((c) => entry(`/${c}`)),
    // News
    ...news.map((n) => entry(`/news/${n.slug}`)),
    // Every listing
    ...bizSlugs.map((s) => entry(`/business/${s}`)),
    // Business blogs
    ...blogIndexes.map((s) => entry(`/business/${s}/blog`)),
    ...blogPosts.map((p) => ({
      url: absoluteUrl(`/business/${p.businessSlug}/blog/${p.postSlug}`),
      lastModified: p.updated_at,
    })),
  ];
}
