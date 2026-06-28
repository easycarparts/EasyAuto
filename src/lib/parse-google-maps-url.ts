// Parse a pasted Google Maps share URL into coordinates for the listing map embed.
// Owners paste the link from Google Maps → Share → Copy link. No Places API needed.

export type ParsedGoogleMaps = {
  latitude: number;
  longitude: number;
  place_id: string | null;
  google_link: string;
};

export type ParseGoogleMapsResult = ParsedGoogleMaps | { error: string };

export function parseGoogleMapsUrl(raw: string): ParseGoogleMapsResult | null {
  const input = raw.trim();
  if (!input) return null;

  let url: URL;
  try {
    url = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    return { error: "That doesn't look like a valid link." };
  }

  const hostPath = `${url.hostname}${url.pathname}`;
  if (!/(^|\.)google\.[a-z.]+\/maps|^maps\.google\./i.test(hostPath)) {
    return { error: "Please paste a Google Maps link (google.com/maps/...)." };
  }

  const full = decodeURIComponent(url.toString());

  // Place pin coords (!3d…!4d…) are more accurate than the map viewport (@…).
  const placeCoords = full.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const atCoords = full.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const qParam = url.searchParams.get("q");
  const qCoords = qParam?.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);

  let latitude: number | null = null;
  let longitude: number | null = null;

  if (placeCoords) {
    latitude = Number(placeCoords[1]);
    longitude = Number(placeCoords[2]);
  } else if (atCoords) {
    latitude = Number(atCoords[1]);
    longitude = Number(atCoords[2]);
  } else if (qCoords) {
    latitude = Number(qCoords[1]);
    longitude = Number(qCoords[2]);
  }

  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return {
      error:
        "Couldn't read coordinates from that link. In Google Maps, open your business → Share → Copy link, then paste the full URL here.",
    };
  }

  let place_id = url.searchParams.get("place_id");
  if (!place_id) {
    const chij = full.match(/!(?:19s|1s)(ChIJ[\w-]+)/);
    if (chij) place_id = chij[1];
  }

  return { latitude, longitude, place_id, google_link: input };
}
