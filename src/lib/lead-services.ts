// Resolve the best lead-capture service label for a listing.
//
// A listing's primary `category_slug` is often a poor banner label (e.g. an auto
// detailer whose category is "auto-care-products-store" → "auto care products store
// quotes" reads as nonsense). Its `service_tags` are the richer signal — the same
// detailer is tagged paint-protection-film / ceramic / detailing. So we derive the
// banner's service from the tags, preferring the high-value "money" services we run
// funnels for, and only ever fall back to a clean generic — never a raw category.

import { getGroupForCategory } from "./taxonomy";

export type LeadService = { label: string; slug: string };

// Money services in priority order — best-reading + the ones the owner competes in.
const MONEY_SERVICES: { tag: string; label: string }[] = [
  { tag: "paint-protection-film", label: "paint protection film" },
  { tag: "ceramic-coating-service", label: "ceramic coating" },
  { tag: "car-detailing-service", label: "car detailing" },
  { tag: "auto-window-tinting-service", label: "window tinting" },
  { tag: "window-tinting-service", label: "window tinting" },
  { tag: "vehicle-wrapping-service", label: "car wrapping" },
  { tag: "towing-service", label: "car recovery" },
  { tag: "car-wash", label: "car wash" },
  { tag: "self-service-car-wash", label: "car wash" },
];

// Friendly label per service group for the long tail (repair, parts, tyres…).
const GROUP_LABELS: Record<string, string> = {
  "wash-and-cleaning": "car wash",
  "detailing-and-protection": "car detailing",
  "tinting-and-wrapping": "window tinting & wraps",
  "repair-and-maintenance": "car servicing & repair",
  "body-and-paint": "bodywork & paint",
  "parts-and-accessories": "car parts",
  "tyres-and-wheels": "tyres",
  "towing-and-recovery": "car recovery",
  "dealers-and-rental": "car services",
};

export function resolveLeadService(business: {
  category_slug: string | null;
  service_tags: string[] | null;
}): LeadService {
  const tags =
    business.service_tags && business.service_tags.length > 0
      ? business.service_tags
      : business.category_slug
        ? [business.category_slug]
        : [];

  // 1) Prefer a recognised money service — richest + best-reading, and keeps the
  //    slug aligned to HIGH_INTENT_CATEGORIES so the lead is owner-attributed.
  for (const m of MONEY_SERVICES) {
    if (tags.includes(m.tag)) return { label: m.label, slug: m.tag };
  }

  // 2) Fall back to the friendly group label for this listing's category.
  const group = business.category_slug ? getGroupForCategory(business.category_slug) : undefined;
  if (group && GROUP_LABELS[group.slug]) {
    return { label: GROUP_LABELS[group.slug], slug: business.category_slug! };
  }

  // 3) Generic catch-all — never an awkward raw category name.
  return { label: "car services", slug: business.category_slug ?? "auto-services" };
}
