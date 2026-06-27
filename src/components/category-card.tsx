import Link from "next/link";
import type { Category } from "@/lib/types";
import { decodeEntities, formatCount } from "@/lib/format";

// Compact category tile for the homepage grid.
export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/business-category/${category.slug}`}
      className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 shadow-card transition-colors hover:border-brand-300 hover:bg-brand-50"
    >
      <span className="min-w-0">
        <span className="block truncate font-semibold text-ink group-hover:text-brand-700">
          {decodeEntities(category.name)}
        </span>
        <span className="text-sm text-muted">
          {formatCount(category.listing_count)} listings
        </span>
      </span>
      <span
        className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600"
        aria-hidden="true"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}
