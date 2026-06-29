// Lead routing config (Step 6 foundation).
//
// High-intent categories that the owner's own services (Grand Touch — detailing /
// PPF / wash) compete in. When the owner's funnel number is set, the primary CTA
// on those listings routes to the owner instead of the listed business. Until then
// every WhatsApp CTA goes to the listed business's own number.

// The services GrandTouch actually fulfils, grouped so the funnel copy can be
// service-specific ("Get a ceramic coating quote" vs "Book a service"). Every
// category here routes its lead to the owner's funnel first.
export const OWNER_SERVICE_CATEGORIES: Record<string, string[]> = {
  // Core money-makers: tint / ceramic / PPF / detailing
  "Detailing, ceramic & PPF": [
    "car-detailing-service",
    "wash-detail-tint",
    "paint-protection-film", // PPF (service category added in migration 0010)
    "ceramic-coating-service", // ceramic coating (added in migration 0010)
    "vehicle-wrapping-service", // PPF / wraps
  ],
  Tinting: ["auto-window-tinting-service", "window-tinting-service"],
  // Full garage: servicing & mechanical
  "Servicing & repair": [
    "auto-repair-shop",
    "car-repair-and-maintenance-service",
    "auto-repair-service",
    "mechanic",
    "oil-change-service",
    "auto-tune-up-service",
    "auto-air-conditioning-service",
    "auto-electrical-service",
    "vehicle-inspection-service",
  ],
  // Paint booth: full paint, smart repair, PDR
  "Paint & bodywork": [
    "auto-body-shop",
    "auto-bodywork-mechanic",
    "auto-dent-removal-service",
    "auto-painting",
  ],
};

export const HIGH_INTENT_CATEGORIES = new Set<string>(
  Object.values(OWNER_SERVICE_CATEGORIES).flat(),
);

// Which GrandTouch service line a category belongs to (for funnel copy).
export function ownerServiceLine(categorySlug: string | null): string | null {
  if (!categorySlug) return null;
  for (const [line, slugs] of Object.entries(OWNER_SERVICE_CATEGORIES)) {
    if (slugs.includes(categorySlug)) return line;
  }
  return null;
}

// Owner's own-services funnel. Set `whatsapp` (international digits, e.g.
// "9715XXXXXXXX") when provided to switch high-intent CTAs to the owner.
export const OWNER_FUNNEL: { whatsapp: string | null; name: string } = {
  whatsapp: null,
  name: "Grand Touch",
};

export type LeadRoute = "own_service" | "business";

export function routeFor(categorySlug: string | null): LeadRoute {
  if (
    OWNER_FUNNEL.whatsapp &&
    categorySlug &&
    HIGH_INTENT_CATEGORIES.has(categorySlug)
  ) {
    return "own_service";
  }
  return "business";
}

// Is this service/category one the owner's own business competes in? Independent
// of whether the funnel number is configured yet — used to TAG captured form leads
// (`routed_to`) so high-intent enquiries are attributable to the owner from day one.
export function isHighIntentService(slug: string | null): boolean {
  return Boolean(slug && HIGH_INTENT_CATEGORIES.has(slug));
}
