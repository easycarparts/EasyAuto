// Builders for schema.org JSON-LD. Kept separate so pages stay readable and the
// shapes are reusable. We have rating, address, geo and hours → LocalBusiness is
// eligible for rich results.

import type { Business } from "./types";
import { SITE, absoluteUrl } from "./site";
import { decodeEntities, stripHtml } from "./format";

export function localBusinessJsonLd(
  business: Business,
  categoryName?: string,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": absoluteUrl(`/business/${business.slug}`),
    name: business.name,
    url: absoluteUrl(`/business/${business.slug}`),
  };

  if (categoryName) data.description = `${decodeEntities(categoryName)} in ${business.city ?? "the UAE"}.`;
  if (business.description) data.description = stripHtml(business.description).slice(0, 300);
  if (business.thumbnail_url) data.image = business.thumbnail_url;
  if (business.phone) data.telephone = business.phone;
  if (business.website) data.url = business.website;

  if (business.address) {
    data.address = {
      "@type": "PostalAddress",
      streetAddress: business.address,
      addressLocality: business.city ?? undefined,
      addressCountry: "AE",
    };
  }

  if (business.latitude != null && business.longitude != null) {
    data.geo = {
      "@type": "GeoCoordinates",
      latitude: business.latitude,
      longitude: business.longitude,
    };
  }

  if (business.rating != null && (business.google_reviews ?? 0) > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: business.rating,
      reviewCount: business.google_reviews,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return data;
}

export function breadcrumbJsonLd(
  items: { name: string; url: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
