// 301/308 redirect map (Step 3). Imported by next.config.ts.
//
// Two sources of redirects:
//  1) The 102 "orphan" old category URLs (live/indexed on the old WP site but
//     with no businesses in our data — see data/old-urls.json). Real-but-empty
//     auto categories point at the closest new service-group hub; non-automotive
//     junk (mosque, deli, band…) goes to the homepage.
//  2) A few known legacy permalinks (Step 1 analysis).
//
// Next's `permanent: true` emits HTTP 308 (Permanent Redirect) — Google treats it
// as equivalent to a 301 for ranking/consolidation. Kept as plain data (no app
// imports) so it loads cleanly inside next.config.ts.

import { readFileSync } from "node:fs";
import path from "node:path";

type Redirect = { source: string; destination: string; permanent: boolean };

// Duplicate business listings removed by scripts/curate.mjs: each removed slug
// 301s to the canonical listing it was a copy of (slugs are indexed URLs).
function businessDedupeRedirects(): Redirect[] {
  try {
    const raw = readFileSync(path.join(process.cwd(), "data", "dedup-redirects.json"), "utf8");
    const map = (JSON.parse(raw).redirects ?? {}) as Record<string, string>;
    return Object.entries(map).map(([from, to]) => ({
      source: `/business/${from}`,
      destination: `/business/${to}`,
      permanent: true,
    }));
  } catch {
    return []; // file absent before the curation pass has run
  }
}

const HUB = (slug: string) => `/business-category/${slug}`;

// Orphan category slug -> destination. Anything in ALL_ORPHANS not listed here
// falls back to the homepage ("/").
const ORPHAN_TARGETS: Record<string, string> = {
  // Repair & Maintenance
  "auto-spring-shop": HUB("repair-and-maintenance"),
  "auto-sunroof-shop": HUB("repair-and-maintenance"),
  "car-inspection-station": HUB("repair-and-maintenance"),
  "diesel-engine-repair-service": HUB("repair-and-maintenance"),
  "electric-motor-repair-shop": HUB("repair-and-maintenance"),
  "rv-repair-shop": HUB("repair-and-maintenance"),
  "small-engine-repair-service": HUB("repair-and-maintenance"),
  "repair-service": HUB("repair-and-maintenance"),
  "machine-shop": HUB("repair-and-maintenance"),
  // Tyres & Wheels
  "tire-repair-shop": HUB("tyres-and-wheels"),
  "tyre-manufacturer": HUB("tyres-and-wheels"),
  "wheel-alignment-service": HUB("tyres-and-wheels"),
  "wheel-store": HUB("tyres-and-wheels"),
  // Detailing & Protection
  "rv-detailing-service": HUB("detailing-and-protection"),
  "leather-cleaning-service": HUB("detailing-and-protection"),
  "upholstery-cleaning-service": HUB("detailing-and-protection"),
  "metal-polishing-service": HUB("detailing-and-protection"),
  // Body & Paint
  "leather-repair-service": HUB("body-and-paint"),
  "upholstery-shop": HUB("body-and-paint"),
  "paint-store": HUB("body-and-paint"),
  "sandblasting-service": HUB("body-and-paint"),
  "glass-etching-service": HUB("body-and-paint"),
  // Tinting & Wrapping
  "decal-supplier": HUB("tinting-and-wrapping"),
  "sticker-manufacturer": HUB("tinting-and-wrapping"),
  "vinyl-sign-shop": HUB("tinting-and-wrapping"),
  // Parts & Accessories
  "car-stereo-store": HUB("parts-and-accessories"),
  // Dealers & Rental
  "auto-broker": HUB("dealers-and-rental"),
  "car-rental-agency": HUB("dealers-and-rental"),
  "motor-vehicle-dealer": HUB("dealers-and-rental"),
  "motorcycle-shop": HUB("dealers-and-rental"),
  "tesla-showroom": HUB("dealers-and-rental"),
  // Wash & Cleaning
  "pressure-washing-service": HUB("wash-and-cleaning"),
};

// All 102 orphan category slugs (from data/old-urls.json → analysis.orphan_categories).
const ALL_ORPHANS: string[] = [
  "auto-broker", "auto-spring-shop", "auto-sunroof-shop", "automation-company",
  "band", "boat-cleaning-service", "boat-detailing-service", "car-inspection-station",
  "car-rental-agency", "car-stereo-store", "carpenter", "carpet-cleaning-service",
  "ceramics-wholesaler", "childrens-amusement-center", "childrens-party-service",
  "cleaners", "coffee-shop", "commercial-printer", "corporate-gift-supplier",
  "custom-label-printer", "custom-t-shirt-store", "decal-supplier", "deli",
  "design-agency", "diesel-engine-repair-service", "digital-printer",
  "display-stand-manufacturer", "dry-cleaner", "dry-ice-supplier", "dvd-store",
  "electric-motor-repair-shop", "electrician", "electronics-store",
  "event-management-company", "exhibition-planner", "fast-food-restaurant",
  "flag-store", "floor-sanding-and-polishing-service", "food-court", "gift-shop",
  "gift-wrap-store", "glass-etching-service", "home-health-care-service", "home-help",
  "house-cleaning-service", "insurance-broker", "interior-designer",
  "interior-fitting-contractor", "kiosk", "kitchen-remodeler", "laser-cutting-service",
  "laser-tag-center", "laundry-service", "leather-cleaning-service",
  "leather-repair-service", "lodging", "machine-shop", "manufacturer",
  "marketing-agency", "metal-fabricator", "metal-polishing-service", "mosque",
  "motor-vehicle-dealer", "motorcycle-shop", "packaging-company", "paint-store",
  "painting", "painting-studio", "party-planner", "pastry-shop", "pest-control-service",
  "pool-cleaning-service", "pressure-washing-service", "print-shop",
  "promotional-products-supplier", "property-maintenance", "repair-service",
  "rv-detailing-service", "rv-repair-shop", "sandblasting-service", "screen-printer",
  "siding-contractor", "sign-shop", "small-engine-repair-service", "steel-fabricator",
  "steelwork-design-service", "sticker-manufacturer", "store", "tesla-showroom",
  "tire-repair-shop", "tyre-manufacturer", "upholstery-cleaning-service",
  "upholstery-shop", "valet-parking-service", "vinyl-sign-shop", "wallpaper-installer",
  "wallpaper-store", "wheel-alignment-service", "wheel-store", "window-cleaning-service",
  "window-installation-service", "woodworking-supply-store",
];

const LEGACY_REDIRECTS: Redirect[] = [
  {
    source: "/2025/07/15/the-ultimate-guide-to-buying-auto-parts-in-the-uae",
    destination: "/news/the-ultimate-guide-to-buying-auto-parts-in-the-uae",
    permanent: true,
  },
  { source: "/2025/06/27/hello-world", destination: "/", permanent: true },
  { source: "/category/uncategorized", destination: "/", permanent: true },
];

// Old WordPress business permalinks carried a second Google-place-id segment:
//   /business/{slug}/{placeid}/   e.g. /business/mrcap-al-quoz/af1qip…s1024/
// The new canonical is single-segment /business/{slug}. The old *sitemap* only
// ever listed the single-segment form, but these 2-segment permalinks may still
// have crawl history / inbound links, so collapse them to the canonical slug.
// The place-id is a long lowercase hash (40+ chars); the {19,} length guard means
// this can NEVER match the real 2-segment route /business/{slug}/blog (4 chars) or
// its nested posts — those stay untouched. Single-segment destination can't match
// the 2-segment source, so there is no redirect loop.
const BUSINESS_LEGACY_PERMALINK_REDIRECTS: Redirect[] = [
  {
    source: "/business/:slug/:placeid([a-z0-9][a-z0-9_-]{19,})",
    destination: "/business/:slug",
    permanent: true,
  },
];

// WordPress plugin utility pages that moved under /dashboard or were consolidated.
const UTILITY_REDIRECTS: Redirect[] = [
  { source: "/submit-business-2", destination: "/submit-business", permanent: true },
  { source: "/submit-business-3", destination: "/submit-business", permanent: true },
  { source: "/business-dashboard", destination: "/dashboard", permanent: true },
  { source: "/user-dashboard", destination: "/dashboard", permanent: true },
  { source: "/my-subscription-dashboard", destination: "/dashboard", permanent: true },
  { source: "/claim-status", destination: "/dashboard", permanent: true },
  { source: "/sample-page", destination: "/", permanent: true },
  { source: "/author/:path*", destination: "/", permanent: true },
];

export function categoryRedirects(): Redirect[] {
  const orphanRedirects: Redirect[] = ALL_ORPHANS.map((slug) => ({
    source: `/business-category/${slug}`,
    destination: ORPHAN_TARGETS[slug] ?? "/",
    permanent: true,
  }));
  return [
    ...orphanRedirects,
    ...LEGACY_REDIRECTS,
    ...UTILITY_REDIRECTS,
    ...BUSINESS_LEGACY_PERMALINK_REDIRECTS,
    ...businessDedupeRedirects(),
  ];
}
