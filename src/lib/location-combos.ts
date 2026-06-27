// Shared computation of which /<service>-in-<location> combos have real inventory.
// Used by the page's generateStaticParams and by the sitemap, so they never drift.

import { COMMUNITIES, emirateForCity } from "./locations";
import { ALL_SERVICES, getGroupForCategory } from "./taxonomy";

export type LocationFacet = {
  category_slug: string | null;
  city: string | null;
  address: string | null;
};

export function computeLocationCombos(
  facets: LocationFacet[],
  topCategorySlugs: Set<string>,
  minListings = 3,
): string[] {
  const counts = new Map<string, number>();

  for (const f of facets) {
    const em = emirateForCity(f.city);
    if (!em) continue;
    const locations = [em.slug];
    const addr = (f.address ?? "").toLowerCase();
    for (const c of COMMUNITIES) {
      if (c.emirate === em.slug && c.keywords.some((k) => addr.includes(k.toLowerCase()))) {
        locations.push(c.slug);
      }
    }
    const services = new Set<string>([ALL_SERVICES.slug]);
    if (f.category_slug) {
      const g = getGroupForCategory(f.category_slug);
      if (g) services.add(g.slug);
      if (topCategorySlugs.has(f.category_slug)) services.add(f.category_slug);
    }
    for (const s of services) {
      for (const l of locations) {
        const key = `${s}|${l}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  const combos: string[] = [];
  for (const [key, n] of counts) {
    if (n < minListings) continue;
    const [service, location] = key.split("|");
    combos.push(`${service}-in-${location}`);
  }
  return combos;
}
