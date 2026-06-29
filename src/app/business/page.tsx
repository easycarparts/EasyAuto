import type { Metadata } from "next";
import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BusinessCard } from "@/components/business-card";
import { Pagination } from "@/components/pagination";
import { JsonLd } from "@/components/json-ld";
import { getAllBusinesses, getAllCategories } from "@/lib/data";
import { formatCount } from "@/lib/format";
import { SITE, absoluteUrl } from "@/lib/site";
import { itemListJsonLd } from "@/lib/structured-data";

const PER_PAGE = 24;

export const metadata: Metadata = {
  title: "All businesses",
  description: `Browse ${SITE.name}'s directory of auto-service businesses across the UAE — car wash, detailing, repair, parts, towing and more.`,
  alternates: { canonical: absoluteUrl("/business") },
};

export default async function BusinessIndexPage({
  searchParams,
}: PageProps<"/business">) {
  const sp = await searchParams;
  const page = toPage(sp.page);
  const [result, categories] = await Promise.all([
    getAllBusinesses(page, PER_PAGE),
    getAllCategories(),
  ]);
  const categoryNames = new Map(categories.map((c) => [c.slug, c.name]));

  return (
    <>
      {result.items.length > 0 && (
        <JsonLd
          data={itemListJsonLd(
            result.items.map((b) => ({
              name: b.name,
              url: absoluteUrl(`/business/${b.slug}`),
            })),
            "Auto businesses in the UAE",
          )}
        />
      )}

      <div className="border-b border-line bg-surface">
        <Container className="py-8">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Businesses" }]} />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Auto businesses in the UAE
          </h1>
          <p className="mt-2 text-muted">
            {formatCount(result.total)} businesses — browse the full directory or filter by{" "}
            <a href="/" className="font-semibold text-brand-600 hover:text-brand-700">
              service category
            </a>
            .
          </p>
        </Container>
      </div>

      <Container className="py-10">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((b) => (
            <BusinessCard
              key={b.id}
              business={b}
              categoryName={
                b.category_slug ? categoryNames.get(b.category_slug) : undefined
              }
            />
          ))}
        </div>

        {result.totalPages > 1 && (
          <Pagination page={result.page} totalPages={result.totalPages} basePath="/business" />
        )}
      </Container>
    </>
  );
}

function toPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
