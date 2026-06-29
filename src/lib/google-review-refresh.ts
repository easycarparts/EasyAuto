import "server-only";

import type { Business } from "./types";
import { fetchGooglePlaceDetails } from "./google-places";
import { parseGoogleMapsUrl } from "./parse-google-maps-url";

export function resolvePlaceId(
  business: Pick<Business, "place_id" | "google_link">,
): string | null {
  if (business.place_id) return business.place_id;
  if (!business.google_link) return null;
  const parsed = parseGoogleMapsUrl(business.google_link);
  if (!parsed || "error" in parsed) return null;
  return parsed.place_id;
}

export async function fetchLiveGoogleReviews(
  business: Pick<Business, "place_id" | "google_link">,
) {
  const placeId = resolvePlaceId(business);
  if (!placeId) {
    return {
      error:
        "No Google Place ID — save a Google Maps link on the listing first.",
    };
  }

  const fetched = await fetchGooglePlaceDetails(placeId);
  if ("error" in fetched) return fetched;

  return { ...fetched, placeId };
}
