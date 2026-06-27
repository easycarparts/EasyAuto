// Lead routing config (Step 6 foundation).
//
// High-intent categories that the owner's own services (Grand Touch — detailing /
// PPF / wash) compete in. When the owner's funnel number is set, the primary CTA
// on those listings routes to the owner instead of the listed business. Until then
// every WhatsApp CTA goes to the listed business's own number.

export const HIGH_INTENT_CATEGORIES = new Set<string>([
  "car-detailing-service",
  "car-wash",
  "self-service-car-wash",
  "vehicle-wrapping-service",
  "auto-window-tinting-service",
  "window-tinting-service",
  "auto-restoration-service",
  "wash-detail-tint",
]);

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
