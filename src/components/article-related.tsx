import Link from "next/link";
import type { FeedItem } from "@/lib/content-feed";
import type { DirectoryLink } from "@/lib/article-links";
import { decodeEntities } from "@/lib/format";

export function ArticleRelated({
  directoryLinks,
  related,
}: {
  directoryLinks?: DirectoryLink[];
  related: FeedItem[];
}) {
  if (!directoryLinks?.length && related.length === 0) return null;

  return (
    <aside className="mx-auto mt-14 max-w-3xl space-y-10">
      {directoryLinks && directoryLinks.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-ink">Explore the directory</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {directoryLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-block rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-brand-600 shadow-card transition hover:border-brand-300 hover:bg-brand-50"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-ink">Related articles</h2>
          <ul className="mt-4 space-y-3">
            {related.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="block rounded-xl border border-line bg-surface px-4 py-3 shadow-card transition hover:border-brand-300 hover:bg-brand-50"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-faint">
                    {item.kind === "editorial" ? "Editorial" : "Business guide"}
                  </span>
                  <span className="mt-1 block font-semibold text-ink">
                    {decodeEntities(item.title)}
                  </span>
                  {item.kind === "business" && item.businessName && (
                    <span className="mt-0.5 block text-sm text-muted">
                      {decodeEntities(item.businessName)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
