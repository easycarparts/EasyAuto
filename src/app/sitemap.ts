import type { MetadataRoute } from "next";
import {
  getAllBusinessSlugs,
  getAllCategories,
  getAllNews,
  getLocationFacets,
} from "@/lib/data";
import { SERVICE_GROUPS } from "@/lib/taxonomy";
import { computeLocationCombos } from "@/lib/location-combos";
import { absoluteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [bizSlugs, categories, news, facets] = await Promise.all([
    getAllBusinessSlugs(),
    getAllCategories(),
    getAllNews(),
    getLocationFacets(),
  ]);

  const topCats = new Set(categories.slice(0, 15).map((c) => c.slug));
  const combos = computeLocationCombos(facets, topCats, 3);
  const entry = (path: string): MetadataRoute.Sitemap[number] => ({ url: absoluteUrl(path) });

  return [
    { url: absoluteUrl("/"), priority: 1 },
    entry("/news"),
    // Service-group hubs + raw category pages
    ...SERVICE_GROUPS.map((g) => entry(`/business-category/${g.slug}`)),
    ...categories.map((c) => entry(`/business-category/${c.slug}`)),
    // Programmatic location pages
    ...combos.map((c) => entry(`/${c}`)),
    // News
    ...news.map((n) => entry(`/news/${n.slug}`)),
    // Every listing
    ...bizSlugs.map((s) => entry(`/business/${s}`)),
  ];
}
