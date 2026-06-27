import Image from "next/image";
import Link from "next/link";
import type { Business } from "@/lib/types";
import { decodeEntities } from "@/lib/format";
import { RatingStars } from "./rating-stars";
import { ScoreBadge } from "./score-badge";

// A listing card used on the homepage, category pages and search results.
export function BusinessCard({
  business,
  categoryName,
  distanceKm,
}: {
  business: Business;
  categoryName?: string;
  distanceKm?: number;
}) {
  const { slug, name, thumbnail_url, rating, google_reviews, city, address } =
    business;

  return (
    <Link
      href={`/business/${slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-shadow hover:shadow-pop"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-canvas">
        {thumbnail_url ? (
          <Image
            src={thumbnail_url}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Placeholder name={name} />
        )}
        {categoryName && (
          <span className="absolute left-3 top-3 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-semibold text-body shadow-sm backdrop-blur">
            {decodeEntities(categoryName)}
          </span>
        )}
        {distanceKm != null && (
          <span className="absolute right-3 top-3 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
            {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-semibold text-ink group-hover:text-brand-600">
          {name}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <RatingStars rating={rating} reviews={google_reviews} />
          <ScoreBadge score={business.easy_auto_score} />
        </div>
        <p className="mt-2 line-clamp-1 text-sm text-muted">
          {city ? <span className="font-medium text-body">{city}</span> : null}
          {city && address ? " · " : null}
          {address ?? ""}
        </p>
      </div>
    </Link>
  );
}

// Decorative fallback when a listing has no image (440 of 4,535 listings).
function Placeholder({ name }: { name: string }) {
  const initials = name
    .replace(/[^a-zA-Z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-50 to-brand-100">
      <span className="text-2xl font-bold text-brand-300">{initials || "EA"}</span>
    </div>
  );
}
