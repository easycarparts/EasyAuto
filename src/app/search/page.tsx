import type { Metadata } from "next";
import { Container } from "@/components/container";
import { SearchBar } from "@/components/search-bar";
import { BusinessCard } from "@/components/business-card";
import { getAllCategories, searchBusinesses } from "@/lib/data";
import { formatCount } from "@/lib/format";

// Search results aren't useful in the index — keep them out of Google.
export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim();

  const [results, categories] = await Promise.all([
    q ? searchBusinesses(q, 48) : Promise.resolve([]),
    getAllCategories(),
  ]);
  const categoryNames = new Map(categories.map((c) => [c.slug, c.name]));

  return (
    <Container className="py-10">
      <h1 className="text-2xl font-bold text-ink">
        {q ? `Results for “${q}”` : "Search"}
      </h1>
      <div className="mt-4 max-w-xl">
        <SearchBar defaultValue={q} />
      </div>

      {q && (
        <p className="mt-6 text-sm text-muted">
          {formatCount(results.length)}
          {results.length === 48 ? "+" : ""} {results.length === 1 ? "match" : "matches"}
        </p>
      )}

      {q && results.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-surface p-12 text-center">
          <p className="text-lg font-semibold text-ink">No matches found</p>
          <p className="mt-1 text-muted">Try a different term, or browse by category.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((b) => (
            <BusinessCard
              key={b.id}
              business={b}
              categoryName={
                b.category_slug ? categoryNames.get(b.category_slug) : undefined
              }
            />
          ))}
        </div>
      )}
    </Container>
  );
}
