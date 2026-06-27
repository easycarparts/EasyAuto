import Link from "next/link";

// SEO-friendly pagination using real <a href> links (?page=N) so crawlers follow them.
export function Pagination({
  basePath,
  page,
  totalPages,
}: {
  basePath: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => (p === 1 ? basePath : `${basePath}?page=${p}`);
  const windowPages = pageWindow(page, totalPages);

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={href(page - 1)} className={navBtn} rel="prev" aria-label="Previous page">
          ‹ Prev
        </Link>
      )}
      {windowPages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-2 text-faint">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={p === page ? activeBtn : pageBtn}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link href={href(page + 1)} className={navBtn} rel="next" aria-label="Next page">
          Next ›
        </Link>
      )}
    </nav>
  );
}

const base =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors";
const pageBtn = `${base} border border-line bg-surface text-body hover:border-brand-300 hover:text-brand-700`;
const activeBtn = `${base} border border-brand-600 bg-brand-600 text-white`;
const navBtn = `${base} border border-line bg-surface text-body hover:border-brand-300 hover:text-brand-700`;

// Produce a compact page list like: 1 … 4 5 [6] 7 8 … 20
function pageWindow(page: number, total: number): (number | "…")[] {
  const span = 1;
  const pages = new Set<number>([1, total]);
  for (let p = page - span; p <= page + span; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}
