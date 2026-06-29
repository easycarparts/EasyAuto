import "server-only";

export type GooglePlaceReview = {
  googleReviewId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  authorUri: string | null;
  rating: number | null;
  text: string;
  relativeTime: string | null;
  publishedAt: string | null;
};

export type GooglePlaceDetails = {
  rating: number;
  reviewCount: number;
  reviews: GooglePlaceReview[];
};

type GoogleApiReview = {
  name?: string;
  relativePublishTimeDescription?: string;
  rating?: number;
  text?: { text?: string };
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  publishTime?: string;
};

function parseReviews(raw: GoogleApiReview[] | undefined): GooglePlaceReview[] {
  return (raw ?? [])
    .map((r, i) => {
      const text = r.text?.text?.trim();
      if (!text) return null;
      return {
        googleReviewId: r.name ?? `review-${i}-${r.publishTime ?? "unknown"}`,
        authorName: r.authorAttribution?.displayName ?? "Google user",
        authorPhotoUrl: r.authorAttribution?.photoUri ?? null,
        authorUri: r.authorAttribution?.uri ?? null,
        rating: r.rating != null ? Math.round(r.rating) : null,
        text,
        relativeTime: r.relativePublishTimeDescription ?? null,
        publishedAt: r.publishTime ?? null,
      };
    })
    .filter((r): r is GooglePlaceReview => r != null);
}

export async function fetchGooglePlaceDetails(
  placeId: string,
): Promise<GooglePlaceDetails | { error: string }> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) {
    return { error: "Google Places API is not configured on the server." };
  }

  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "rating,userRatingCount,reviews",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 404) return { error: "Google could not find this place." };
    if (res.status === 403) return { error: "Google Places API access denied — check the API key." };
    return { error: "Could not fetch reviews from Google. Try again later." };
  }

  const data = (await res.json()) as {
    rating?: number;
    userRatingCount?: number;
    reviews?: GoogleApiReview[];
  };

  if (data.rating == null || !Number.isFinite(data.rating)) {
    return { error: "Google returned no rating for this place." };
  }

  return {
    rating: Number(data.rating.toFixed(1)),
    reviewCount: Math.max(0, Math.round(data.userRatingCount ?? 0)),
    reviews: parseReviews(data.reviews),
  };
}

/** @deprecated Use fetchGooglePlaceDetails */
export async function fetchGooglePlaceReviews(
  placeId: string,
): Promise<{ rating: number; reviewCount: number } | { error: string }> {
  const result = await fetchGooglePlaceDetails(placeId);
  if ("error" in result) return result;
  return { rating: result.rating, reviewCount: result.reviewCount };
}

export function isGooglePlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim());
}
