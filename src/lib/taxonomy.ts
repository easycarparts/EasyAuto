// New category taxonomy (Step 3).
//
// Strategy = HYBRID: the 96 raw Google category URLs keep working unchanged
// (zero redirect risk on pages that already rank). On top of them we add 9
// human-sensible "service group" HUB pages at /business-category/<group-slug>,
// each aggregating its member categories. Junk/orphan category URLs are
// 301-redirected separately (see src/lib/redirects.ts).
//
// Group slugs are deliberately chosen NOT to collide with any existing raw
// category slug or old orphan slug.

import type { Category } from "./types";

export type ServiceGroup = {
  slug: string;
  name: string;
  tagline: string;
  // Raw category slugs (from data/categories.json) that belong to this group.
  members: string[];
};

export const SERVICE_GROUPS: ServiceGroup[] = [
  {
    slug: "wash-and-cleaning",
    name: "Wash & Cleaning",
    tagline: "Car wash, steam wash and self-service bays across the UAE.",
    members: ["car-wash", "self-service-car-wash", "bike-wash"],
  },
  {
    slug: "detailing-and-protection",
    name: "Detailing & Protection",
    tagline:
      "Detailing, ceramic coating, paint protection and interior care specialists.",
    members: [
      "car-detailing-service",
      "paint-protection-film",
      "ceramic-coating-service",
      "auto-restoration-service",
      "auto-care-products-store",
      "wash-detail-tint",
    ],
  },
  {
    slug: "tinting-and-wrapping",
    name: "Tinting & Wrapping",
    tagline: "Window tinting, vinyl wraps and vehicle styling.",
    members: [
      "auto-window-tinting-service",
      "window-tinting-service",
      "vehicle-wrapping-service",
    ],
  },
  {
    slug: "repair-and-maintenance",
    name: "Repair & Maintenance",
    tagline:
      "Garages and mechanics for servicing, AC, electrical, brakes and engine work.",
    members: [
      "auto-repair-shop",
      "car-repair-and-maintenance-service",
      "auto-repair-service",
      "auto-air-conditioning-service",
      "auto-electrical-service",
      "mechanic",
      "oil-change-service",
      "auto-tune-up-service",
      "engine-rebuilding-service",
      "auto-glass-repair-service",
      "auto-radiator-repair-service",
      "air-conditioning-repair-service",
      "auto-machine-shop",
      "brake-shop",
      "vehicle-inspection-service",
    ],
  },
  {
    slug: "body-and-paint",
    name: "Body & Paint",
    tagline: "Bodywork, dent removal, painting and upholstery.",
    members: [
      "auto-body-shop",
      "auto-bodywork-mechanic",
      "auto-dent-removal-service",
      "auto-painting",
      "auto-upholsterer",
      "airbrushing-service",
    ],
  },
  {
    slug: "parts-and-accessories",
    name: "Parts & Accessories",
    tagline:
      "New and used auto parts, batteries, accessories and wholesalers.",
    members: [
      "auto-parts-store",
      "auto-parts-market",
      "used-auto-parts-store",
      "car-accessories-store",
      "auto-accessories-wholesaler",
      "car-battery-store",
      "battery-store",
      "truck-parts-supplier",
      "auto-body-parts-supplier",
      "auto-parts-manufacturer",
      "air-filter-supplier",
      "car-alarm-supplier",
      "auto-market",
      "manufacturer-wholesale",
      "junkyard",
      "salvage-scrap-yard",
    ],
  },
  {
    slug: "tyres-and-wheels",
    name: "Tyres & Wheels",
    tagline: "Tyre shops, wheels and alignment.",
    members: ["tire-wheel-shop", "tire-shop"],
  },
  {
    slug: "towing-and-recovery",
    name: "Towing & Recovery",
    tagline: "Recovery, towing, transport and chauffeur services.",
    members: [
      "towing-service",
      "transportation-service",
      "crane-rental-agency",
      "trucking-company",
      "transport-chauffeur",
      "chauffeur-service",
    ],
  },
  {
    slug: "dealers-and-rental",
    name: "Dealers & Rental",
    tagline: "New and used car dealers, auctions, rental and leasing.",
    members: [
      "car-dealer",
      "used-car-dealer",
      "motorcycle-atv-dealer",
      "auto-auction",
      "auction-broker",
      "car-rental-leasing",
      "car-leasing-service",
      "vehicle-exporter",
      "truck-equipment-dealer",
    ],
  },
];

const GROUP_BY_SLUG = new Map(SERVICE_GROUPS.map((g) => [g.slug, g]));

// raw category slug -> the group it belongs to (for "back to group" links).
const GROUP_BY_MEMBER = new Map<string, ServiceGroup>();
for (const g of SERVICE_GROUPS) {
  for (const m of g.members) GROUP_BY_MEMBER.set(m, g);
}

export function getServiceGroup(slug: string): ServiceGroup | undefined {
  return GROUP_BY_SLUG.get(slug);
}

export function isServiceGroupSlug(slug: string): boolean {
  return GROUP_BY_SLUG.has(slug);
}

export function getGroupForCategory(
  categorySlug: string,
): ServiceGroup | undefined {
  return GROUP_BY_MEMBER.get(categorySlug);
}

// ---------------------------------------------------------------------------
// Service resolution for the programmatic /<service>-in-<location> pages.
// A "service" can be the all-services token, a group, or a single raw category.
// ---------------------------------------------------------------------------
export const ALL_SERVICES = { slug: "auto-services", name: "Auto services" };

export type ResolvedService = {
  slug: string;
  name: string;
  // null = every category (the "auto-services" hub); otherwise the categories to filter on.
  categorySlugs: string[] | null;
  isGroup: boolean;
};

export function resolveService(
  slug: string,
  categories: Category[],
): ResolvedService | undefined {
  if (slug === ALL_SERVICES.slug) {
    return { slug, name: ALL_SERVICES.name, categorySlugs: null, isGroup: false };
  }
  const group = GROUP_BY_SLUG.get(slug);
  if (group) {
    return { slug, name: group.name, categorySlugs: group.members, isGroup: true };
  }
  const category = categories.find((c) => c.slug === slug);
  if (category) {
    return { slug, name: category.name, categorySlugs: [slug], isGroup: false };
  }
  return undefined;
}
