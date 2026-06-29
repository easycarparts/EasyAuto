"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestGoogleReviewRefresh } from "@/app/dashboard/actions";
import { formatCount, formatRating } from "@/lib/format";

export function GoogleReviewsRefresh({
  businessId,
  rating,
  reviewCount,
  claimed,
  hasGooglePlaceRef,
  pendingRequest,
  canRequest,
  requestHint,
}: {
  businessId: number;
  rating: number | null;
  reviewCount: number | null;
  claimed: boolean;
  hasGooglePlaceRef: boolean;
  pendingRequest: { created_at: string } | null;
  canRequest: boolean;
  requestHint?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function handleRequest() {
    setError("");
    setOk("");
    startTransition(async () => {
      const result = await requestGoogleReviewRefresh(businessId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOk("Request sent — an admin will review it before Google is contacted.");
      router.refresh();
    });
  }

  const stars = formatRating(rating);
  const count = reviewCount != null ? formatCount(reviewCount) : null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <p className="font-semibold text-ink">Google reviews</p>
      <p className="mt-1 text-sm text-muted">
        {stars && count ? (
          <>
            <span className="font-semibold text-ink">{stars}★</span> · {count} reviews
          </>
        ) : stars ? (
          <span className="font-semibold text-ink">{stars}★</span>
        ) : (
          "No Google rating stored yet."
        )}
      </p>
      <p className="mt-2 text-xs text-faint">
        Live updates use a paid Google API — each request is reviewed by an admin before
        Google is contacted.
      </p>

      {pendingRequest ? (
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
          Refresh request pending since{" "}
          {new Date(pendingRequest.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          .
        </p>
      ) : canRequest ? (
        <button
          type="button"
          onClick={handleRequest}
          disabled={pending}
          className="mt-3 w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm font-semibold text-body transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Request Google review update"}
        </button>
      ) : (
        <p className="mt-3 text-xs text-faint">
          {requestHint ??
            (!claimed
              ? "Claim this listing before requesting a review refresh."
              : !hasGooglePlaceRef
                ? "Save a Google Maps link above first."
                : "You cannot request a refresh right now.")}
        </p>
      )}

      {error && (
        <p className="mt-2 rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-600">{error}</p>
      )}
      {ok && (
        <p className="mt-2 rounded-lg bg-success-500/10 px-3 py-2 text-xs text-success-600">{ok}</p>
      )}
    </div>
  );
}
