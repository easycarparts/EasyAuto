"use client";

import Image from "next/image";
import { useState } from "react";
import type { BusinessGoogleReview } from "@/lib/types";

export function GoogleReviewCarousel({
  reviews,
  mapsLink,
}: {
  reviews: BusinessGoogleReview[];
  mapsLink?: string | null;
}) {
  const [index, setIndex] = useState(0);
  if (reviews.length === 0) return null;

  const review = reviews[index]!;
  const hasMultiple = reviews.length > 1;

  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold text-ink">Google reviews</h2>
        {hasMultiple && (
          <span className="text-sm text-muted">
            {index + 1} / {reviews.length}
          </span>
        )}
      </div>

      <div className="relative mt-4">
        <article className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <div className="flex items-start gap-3">
            {review.author_photo_url ? (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-canvas">
                <Image
                  src={review.author_photo_url}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">
                {(review.author_name ?? "G").charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{review.author_name ?? "Google user"}</p>
              <p className="mt-0.5 text-sm text-muted">
                {review.rating != null && <span className="text-brand-600">{review.rating}★</span>}
                {review.rating != null && review.relative_time && <span> · </span>}
                {review.relative_time}
              </p>
            </div>
          </div>
          <p className="mt-4 leading-relaxed text-body">&ldquo;{review.text}&rdquo;</p>
        </article>

        {hasMultiple && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIndex((i) => (i === 0 ? reviews.length - 1 : i - 1))}
              className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-body transition hover:border-brand-300 hover:text-brand-700"
              aria-label="Previous review"
            >
              ← Previous
            </button>
            <div className="flex gap-1.5">
              {reviews.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show review ${i + 1}`}
                  className={`h-2 w-2 rounded-full transition ${
                    i === index ? "bg-brand-600" : "bg-line-strong hover:bg-brand-300"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIndex((i) => (i === reviews.length - 1 ? 0 : i + 1))}
              className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-body transition hover:border-brand-300 hover:text-brand-700"
              aria-label="Next review"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-faint">
        Reviews from Google
        {mapsLink && (
          <>
            {" · "}
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              View on Google Maps
            </a>
          </>
        )}
      </p>
    </section>
  );
}
