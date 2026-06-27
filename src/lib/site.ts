// Site-wide constants. Keep the production domain here so metadata, canonical
// URLs and JSON-LD all point at the right place.

export const SITE = {
  name: "Easy Auto",
  // Used for <title> templates and JSON-LD. The directory's positioning line.
  tagline: "UAE Auto Services Directory",
  description:
    "Find trusted car wash, detailing, auto parts, towing, repair and more across the UAE. Compare ratings, reviews and contact details for thousands of auto-service businesses.",
  url: "https://easyauto.ae",
  locale: "en_AE",
} as const;

// Absolute URL helper for canonical links / structured data.
export function absoluteUrl(pathname: string): string {
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE.url}${clean}`;
}
