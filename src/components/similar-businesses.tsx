import Link from "next/link";
import { BusinessCard } from "@/components/business-card";
import type { Business } from "@/lib/types";
import { decodeEntities } from "@/lib/format";

type SimilarItem = Business & { distanceKm?: number };

export function SimilarBusinesses({
  businesses,
  categoryName,
  city,
}: {
  businesses: SimilarItem[];
  categoryName?: string | null;
  city?: string | null;
}) {
  if (businesses.length === 0) return null;

  const heading = categoryName
    ? `More ${decodeEntities(categoryName).toLowerCase()}${city ? ` in ${city}` : " nearby"}`
    : city
      ? `More auto services in ${city}`
      : "Similar businesses nearby";

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-ink">{heading}</h2>
      <p className="mt-2 text-sm text-muted">
        Compare ratings, contact details and opening hours on other listings.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {businesses.map((b) => (
          <BusinessCard
            key={b.id}
            business={b}
            categoryName={
              categoryName && b.category_slug
                ? decodeEntities(categoryName)
                : undefined
            }
            distanceKm={b.distanceKm}
          />
        ))}
      </div>
      {categoryName && businesses[0]?.category_slug && (
        <p className="mt-4 text-sm">
          <Link
            href={`/business-category/${businesses[0].category_slug}`}
            className="font-semibold text-brand-600 hover:text-brand-700"
          >
            Browse all {decodeEntities(categoryName).toLowerCase()} in the UAE →
          </Link>
        </p>
      )}
    </section>
  );
}
