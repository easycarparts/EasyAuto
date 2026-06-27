import { formatCount, formatRating } from "@/lib/format";

// Compact rating display: a filled star, the numeric rating, and the review count.
export function RatingStars({
  rating,
  reviews,
  className = "",
}: {
  rating: number | null;
  reviews?: number | null;
  className?: string;
}) {
  const value = formatRating(rating);
  if (!value) {
    return (
      <span className={`text-sm text-faint ${className}`}>No rating yet</span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${className}`}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="text-accent-500"
        aria-hidden="true"
      >
        <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.1l-4.95 2.6.94-5.5-4-3.9 5.53-.8L10 1.5z" />
      </svg>
      <span className="font-semibold text-ink">{value}</span>
      {reviews != null && reviews > 0 && (
        <span className="text-muted">({formatCount(reviews)})</span>
      )}
    </span>
  );
}
