// Location taxonomy (Step 5).
//
// Two tiers, both derived from the real listing data:
//  - EMIRATES (7): matched on the `city` field (with normalisation — the export has
//    "Ras Al-Khaimah" dupes, and "Al Ain" is a city within the Abu Dhabi emirate).
//  - COMMUNITIES (~20): well-known areas matched on the `address` field by keyword,
//    so fragments like "Al Quoz Industrial Area 3" / "Al Quoz 1" fold into "Al Quoz".
//
// These power the programmatic /<service>-in-<location> pages, the homepage location
// filter, and internal linking.

export type Emirate = {
  slug: string;
  name: string;
  cityNames: string[]; // raw `city` values that belong to this emirate
};

export type Community = {
  slug: string;
  name: string;
  emirate: string; // emirate slug
  keywords: string[]; // case-insensitive substrings to match in `address`
};

export const EMIRATES: Emirate[] = [
  { slug: "dubai", name: "Dubai", cityNames: ["Dubai"] },
  { slug: "abu-dhabi", name: "Abu Dhabi", cityNames: ["Abu Dhabi", "Al Ain"] },
  { slug: "sharjah", name: "Sharjah", cityNames: ["Sharjah"] },
  { slug: "ajman", name: "Ajman", cityNames: ["Ajman"] },
  { slug: "fujairah", name: "Fujairah", cityNames: ["Fujairah"] },
  {
    slug: "ras-al-khaimah",
    name: "Ras Al Khaimah",
    cityNames: ["Ras Al Khaimah", "Ras Al-Khaimah"],
  },
  { slug: "umm-al-quwain", name: "Umm Al Quwain", cityNames: ["Umm Al Quwain"] },
];

// Curated communities with real auto-service inventory (counts verified against the data).
export const COMMUNITIES: Community[] = [
  // Dubai
  { slug: "al-quoz", name: "Al Quoz", emirate: "dubai", keywords: ["Al Quoz"] },
  { slug: "al-qusais", name: "Al Qusais", emirate: "dubai", keywords: ["Al Qusais"] },
  { slug: "ras-al-khor", name: "Ras Al Khor", emirate: "dubai", keywords: ["Ras Al Khor"] },
  { slug: "dubai-investment-park", name: "Dubai Investment Park", emirate: "dubai", keywords: ["Dubai Investment Park"] },
  { slug: "umm-ramool", name: "Umm Ramool", emirate: "dubai", keywords: ["Umm Ramool"] },
  { slug: "al-barsha", name: "Al Barsha", emirate: "dubai", keywords: ["Al Barsha"] },
  { slug: "business-bay", name: "Business Bay", emirate: "dubai", keywords: ["Business Bay"] },
  { slug: "motor-city", name: "Motor City", emirate: "dubai", keywords: ["Motor City"] },
  { slug: "jebel-ali", name: "Jebel Ali", emirate: "dubai", keywords: ["Jebel Ali"] },
  // Abu Dhabi
  { slug: "musaffah", name: "Musaffah", emirate: "abu-dhabi", keywords: ["Musaffah", "Mussafah"] },
  { slug: "mohamed-bin-zayed-city", name: "Mohamed Bin Zayed City", emirate: "abu-dhabi", keywords: ["Mohamed Bin Zayed", "Mohammed Bin Zayed"] },
  { slug: "khalifa-city", name: "Khalifa City", emirate: "abu-dhabi", keywords: ["Khalifa City"] },
  { slug: "madinat-zayed", name: "Madinat Zayed", emirate: "abu-dhabi", keywords: ["Madinat Zayed", "Madinat Za'id"] },
  { slug: "baniyas", name: "Baniyas", emirate: "abu-dhabi", keywords: ["Bani Yas", "Baniyas"] },
  { slug: "mafraq", name: "Mafraq", emirate: "abu-dhabi", keywords: ["Mafraq"] },
  // Sharjah
  { slug: "al-dhaid", name: "Al Dhaid", emirate: "sharjah", keywords: ["Al Dhaid"] },
  // Ajman
  { slug: "al-jerf", name: "Al Jerf", emirate: "ajman", keywords: ["Al Jerf"] },
  { slug: "ajman-industrial", name: "Ajman Industrial Area", emirate: "ajman", keywords: ["Ajman Industrial"] },
  // Fujairah
  { slug: "dibba", name: "Dibba", emirate: "fujairah", keywords: ["Dibba"] },
  { slug: "al-hail", name: "Al Hail", emirate: "fujairah", keywords: ["Al Hail"] },
  // Ras Al Khaimah
  { slug: "al-dhait", name: "Al Dhait", emirate: "ras-al-khaimah", keywords: ["Al Dhait"] },
];

export type Location =
  | ({ kind: "emirate" } & Emirate)
  | ({ kind: "community" } & Community);

const EMIRATE_BY_SLUG = new Map(EMIRATES.map((e) => [e.slug, e]));
const COMMUNITY_BY_SLUG = new Map(COMMUNITIES.map((c) => [c.slug, c]));
const EMIRATE_BY_CITY = new Map<string, Emirate>();
for (const e of EMIRATES) for (const c of e.cityNames) EMIRATE_BY_CITY.set(c.toLowerCase(), e);

export function getLocation(slug: string): Location | undefined {
  const e = EMIRATE_BY_SLUG.get(slug);
  if (e) return { kind: "emirate", ...e };
  const c = COMMUNITY_BY_SLUG.get(slug);
  if (c) return { kind: "community", ...c };
  return undefined;
}

export function getEmirate(slug: string): Emirate | undefined {
  return EMIRATE_BY_SLUG.get(slug);
}

// Normalise a raw `city` string to its emirate (or undefined for Unknown).
export function emirateForCity(city: string | null): Emirate | undefined {
  if (!city) return undefined;
  return EMIRATE_BY_CITY.get(city.trim().toLowerCase());
}

export function communitiesForEmirate(emirateSlug: string): Community[] {
  return COMMUNITIES.filter((c) => c.emirate === emirateSlug);
}

// Does a listing (by city + address) fall within this location?
export function listingInLocation(
  location: Location,
  city: string | null,
  address: string | null,
): boolean {
  if (location.kind === "emirate") {
    const e = emirateForCity(city);
    return e?.slug === location.slug;
  }
  // community: must be in the right emirate AND address contains a keyword
  const e = emirateForCity(city);
  if (e?.slug !== location.emirate) return false;
  const addr = (address ?? "").toLowerCase();
  return location.keywords.some((k) => addr.includes(k.toLowerCase()));
}
