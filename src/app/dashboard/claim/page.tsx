import Link from "next/link";
import { searchBusinesses } from "@/lib/data";
import { decodeEntities } from "@/lib/format";

export default async function ClaimSearchPage({
  searchParams,
}: PageProps<"/dashboard/claim">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const results = query ? await searchBusinesses(query, 25) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">Claim your business</h1>
      <p className="mt-2 text-sm text-muted">
        Search the directory for your business, then claim it to manage the listing. Can&apos;t find
        it?{" "}
        <Link href="/dashboard/submit" className="font-semibold text-brand-600 hover:text-brand-700">
          Submit it as a new business
        </Link>
        .
      </p>

      <form method="get" className="mt-6 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          autoFocus
          placeholder="Search by business name…"
          className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Search
        </button>
      </form>

      {query && results.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-line-strong bg-surface p-6 text-center text-sm text-muted">
          No matches for “{query}”. Try a different name, or{" "}
          <Link href="/dashboard/submit" className="font-semibold text-brand-600 hover:text-brand-700">
            submit it as a new business
          </Link>
          .
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-6 space-y-3">
          {results.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{decodeEntities(b.name)}</p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {[b.city, b.address].filter(Boolean).join(" · ") || "UAE"}
                </p>
              </div>
              {b.claimed ? (
                <span className="shrink-0 rounded-full bg-success-500/10 px-3 py-1 text-xs font-semibold text-success-600">
                  Already claimed
                </span>
              ) : (
                <Link
                  href={`/dashboard/claim/${b.slug}`}
                  className="shrink-0 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Claim →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
