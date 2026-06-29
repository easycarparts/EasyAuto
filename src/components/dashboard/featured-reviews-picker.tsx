"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFeaturedGoogleReviews } from "@/app/dashboard/actions";
import { MAX_FEATURED_GOOGLE_REVIEWS } from "@/lib/google-review-policy";
import type { BusinessGoogleReview } from "@/lib/types";

export function FeaturedReviewsPicker({
  businessId,
  reviews,
}: {
  businessId: number;
  reviews: BusinessGoogleReview[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(reviews.filter((r) => r.featured).map((r) => r.id)),
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_FEATURED_GOOGLE_REVIEWS) {
        next.add(id);
      }
      return next;
    });
  }

  function handleSave() {
    setError("");
    setOk("");
    startTransition(async () => {
      const result = await updateFeaturedGoogleReviews(businessId, [...selected]);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOk("Featured reviews saved.");
      router.refresh();
    });
  }

  if (reviews.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-card">
        <h2 className="text-base font-bold text-ink">Featured Google reviews</h2>
        <p className="mt-2 text-sm text-muted">
          After an admin approves a Google review refresh, review text appears here for you to
          choose up to {MAX_FEATURED_GOOGLE_REVIEWS} to show on your public page.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-card">
      <h2 className="text-base font-bold text-ink">Featured Google reviews</h2>
      <p className="mt-1 text-sm text-muted">
        Choose up to {MAX_FEATURED_GOOGLE_REVIEWS} reviews to show in a carousel on your public
        listing. Google returns at most 5 reviews per refresh.
      </p>

      <ul className="mt-4 space-y-3">
        {reviews.map((review) => {
          const checked = selected.has(review.id);
          const atCap = selected.size >= MAX_FEATURED_GOOGLE_REVIEWS && !checked;
          return (
            <li key={review.id}>
              <label
                className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                  checked
                    ? "border-brand-300 bg-brand-50"
                    : atCap
                      ? "border-line bg-canvas opacity-60"
                      : "border-line bg-canvas hover:border-brand-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={atCap || pending}
                  onChange={() => toggle(review.id)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-line-strong text-brand-600 focus:ring-brand-400"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-semibold text-ink">{review.author_name ?? "Google user"}</span>
                    {review.rating != null && (
                      <span className="text-brand-600">{review.rating}★</span>
                    )}
                    {review.relative_time && (
                      <span className="text-xs text-faint">{review.relative_time}</span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-body line-clamp-4">
                    {review.text}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save featured reviews"}
        </button>
        <span className="text-xs text-faint">
          {selected.size} of {MAX_FEATURED_GOOGLE_REVIEWS} selected
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">{error}</p>
      )}
      {ok && (
        <p className="mt-3 rounded-lg bg-success-500/10 px-3 py-2 text-sm text-success-600">{ok}</p>
      )}
    </div>
  );
}
