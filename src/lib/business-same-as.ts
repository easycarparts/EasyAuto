import type { Business } from "./types";
import { hasSocialLinks } from "./social-links";

/** External profile URLs for schema.org sameAs — listing page URL is separate. */
export function businessSameAs(business: Business): string[] {
  const links = new Set<string>();
  if (business.website) links.add(business.website);
  if (business.google_link) links.add(business.google_link);
  if (hasSocialLinks(business.social_links)) {
    for (const url of Object.values(business.social_links!)) {
      if (url) links.add(url);
    }
  }
  return [...links];
}
