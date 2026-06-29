import { decodeEntities } from "./format";
import { communitiesForEmirate, emirateForCity, listingInLocation } from "./locations";
import type { Business } from "./types";

export type DirectoryLink = { href: string; label: string };

export function businessDirectoryLinks(
  business: Pick<Business, "slug" | "name" | "city" | "address" | "category_slug">,
  categoryName?: string | null,
): DirectoryLink[] {
  const links: DirectoryLink[] = [];
  const catSlug = business.category_slug;
  const catLabel = categoryName ? decodeEntities(categoryName) : null;

  links.push({
    href: `/business/${business.slug}`,
    label: `${decodeEntities(business.name)} profile`,
  });

  if (catSlug && catLabel) {
    links.push({
      href: `/business-category/${catSlug}`,
      label: `${catLabel} in the UAE`,
    });
  }

  const emirate = emirateForCity(business.city);
  if (catSlug && catLabel && emirate) {
    links.push({
      href: `/${catSlug}-in-${emirate.slug}`,
      label: `${catLabel} in ${emirate.name}`,
    });

    for (const community of communitiesForEmirate(emirate.slug)) {
      if (listingInLocation({ kind: "community", ...community }, business.city, business.address)) {
        links.push({
          href: `/${catSlug}-in-${community.slug}`,
          label: `${catLabel} in ${community.name}`,
        });
        break;
      }
    }
  }

  return links;
}
