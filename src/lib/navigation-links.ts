export function wazeDirectionsUrl(latitude: number, longitude: number): string {
  return `https://www.waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
}

export function googleMapsDirectionsUrl(
  latitude: number,
  longitude: number,
  googleLink?: string | null,
): string {
  if (googleLink) return googleLink;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export type Coordinates = { latitude: number; longitude: number };

export function resolveCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): Coordinates | null {
  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
}

export function hasCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  return latitude != null && longitude != null;
}
