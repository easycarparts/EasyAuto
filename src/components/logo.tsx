import Link from "next/link";

// Simple, self-contained wordmark — a rounded "EA" badge + name. No external asset.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 ${className}`}
      aria-label="Easy Auto — home"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-surface shadow-sm transition-colors group-hover:bg-brand-700">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {/* Simplified car silhouette */}
          <path
            d="M3 13.5l1.6-4.2A2.5 2.5 0 0 1 7 7.6h10a2.5 2.5 0 0 1 2.4 1.7L21 13.5M4 13.5h16v3.2a.8.8 0 0 1-.8.8H18a.8.8 0 0 1-.8-.8V16H6.8v.7a.8.8 0 0 1-.8.8H4.8a.8.8 0 0 1-.8-.8v-3.2Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="7.5" cy="16" r="1.1" fill="currentColor" />
          <circle cx="16.5" cy="16" r="1.1" fill="currentColor" />
        </svg>
      </span>
      <span className="text-lg font-extrabold tracking-tight text-ink">
        Easy<span className="text-brand-600">Auto</span>
      </span>
    </Link>
  );
}
