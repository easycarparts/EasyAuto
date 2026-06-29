import Link from "next/link";
import type { FeedItem } from "@/lib/content-feed";
import { decodeEntities } from "@/lib/format";

export function ArticleFeedCard({ item }: { item: FeedItem }) {
  return (
    <Link
      href={item.href}
      className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6 shadow-card transition-shadow hover:shadow-pop"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <span
          className={
            item.kind === "editorial"
              ? "text-brand-600"
              : "text-muted"
          }
        >
          {item.kind === "editorial" ? "Editorial" : "Business guide"}
        </span>
        {item.publishedAt && (
          <time dateTime={item.publishedAt} className="font-normal normal-case text-faint">
            {new Date(item.publishedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </time>
        )}
      </div>

      <h2 className="mt-3 font-bold text-ink">{decodeEntities(item.title)}</h2>

      {item.kind === "business" && item.businessName && (
        <p className="mt-1 text-sm font-medium text-brand-600">
          {decodeEntities(item.businessName)}
          {item.businessCity ? ` · ${item.businessCity}` : ""}
        </p>
      )}

      {item.excerpt && (
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted">{decodeEntities(item.excerpt)}</p>
      )}

      <span className="mt-4 text-sm font-semibold text-brand-600">Read article →</span>
    </Link>
  );
}
