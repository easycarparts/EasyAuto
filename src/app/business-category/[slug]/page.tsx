import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BusinessCard } from "@/components/business-card";
import { CategoryCard } from "@/components/category-card";
import { Pagination } from "@/components/pagination";
import { JsonLd } from "@/components/json-ld";
import {
  getAllCategories,
  getCategoryBySlug,
  getBusinessesByCategory,
  getBusinessesByCategorySlugs,
  getCategoriesBySlugs,
} from "@/lib/data";
import {
  SERVICE_GROUPS,
  getServiceGroup,
  getGroupForCategory,
} from "@/lib/taxonomy";
import { decodeEntities, formatCount } from "@/lib/format";
import { SITE, absoluteUrl } from "@/lib/site";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/structured-data";

const PER_PAGE = 24;

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return [
    ...SERVICE_GROUPS.map((g) => ({ slug: g.slug })),
    ...categories.map((c) => ({ slug: c.slug })),
  ];
}

export async function generateMetadata({
  params,
}: PageProps<"/business-category/[slug]">): Promise<Metadata> {
  const { slug } = await params;

  const group = getServiceGroup(slug);
  if (group) {
    const title = `${group.name} in the UAE`;
    return {
      title,
      description: `${group.tagline} Compare ratings, reviews and contact details on ${SITE.name}.`,
      alternates: { canonical: absoluteUrl(`/business-category/${slug}`) },
      openGraph: { title, url: absoluteUrl(`/business-category/${slug}`) },
    };
  }

  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };
  const name = decodeEntities(category.name);
  const title = `${name} in the UAE`;
  const description = `Browse ${formatCount(category.listing_count)} ${name.toLowerCase()} businesses across the UAE. Compare ratings, reviews, locations and contact details on ${SITE.name}.`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/business-category/${slug}`) },
    openGraph: { title, description, url: absoluteUrl(`/business-category/${slug}`) },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/business-category/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = toPage(sp.page);

  // A service-group hub page (e.g. /business-category/detailing-and-protection)?
  const group = getServiceGroup(slug);
  if (group) {
    return <GroupHub slug={slug} page={page} />;
  }

  // Otherwise a raw category listing.
  return <CategoryListing slug={slug} page={page} />;
}

// ---------------------------------------------------------------------------
// Service-group hub
// ---------------------------------------------------------------------------
async function GroupHub({ slug, page }: { slug: string; page: number }) {
  const group = getServiceGroup(slug)!;
  const [{ items, total, totalPages }, memberCategories, allCategories] =
    await Promise.all([
      getBusinessesByCategorySlugs(group.members, page, PER_PAGE),
      getCategoriesBySlugs(group.members),
      getAllCategories(),
    ]);

  const categoryNames = new Map(allCategories.map((c) => [c.slug, c.name]));

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE.url },
          { name: group.name, url: absoluteUrl(`/business-category/${slug}`) },
        ])}
      />
      {items.length > 0 && (
        <JsonLd
          data={itemListJsonLd(
            items.map((b) => ({
              name: decodeEntities(b.name),
              url: absoluteUrl(`/business/${b.slug}`),
            })),
            `${group.name} in the UAE`,
          )}
        />
      )}

      <div className="border-b border-line bg-surface">
        <Container className="py-8">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: group.name }]} />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {group.name} in the UAE
          </h1>
          <p className="mt-2 max-w-2xl text-muted">{group.tagline}</p>
          <p className="mt-1 text-sm text-faint">
            {formatCount(total)} businesses across {memberCategories.length} categories
          </p>
        </Container>
      </div>

      <Container className="py-10">
        {memberCategories.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-bold text-ink">Browse by type</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {memberCategories.map((c) => (
                <CategoryCard key={c.slug} category={c} />
              ))}
            </div>
          </section>
        )}

        <h2 className="mb-4 text-xl font-bold text-ink">Top-rated {group.name.toLowerCase()}</h2>
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((b) => (
                <BusinessCard
                  key={b.id}
                  business={b}
                  categoryName={
                    b.category_slug ? categoryNames.get(b.category_slug) : undefined
                  }
                />
              ))}
            </div>
            <Pagination
              basePath={`/business-category/${slug}`}
              page={page}
              totalPages={totalPages}
            />
          </>
        )}
      </Container>
    </>
  );
}

// ---------------------------------------------------------------------------
// Raw category listing
// ---------------------------------------------------------------------------
async function CategoryListing({ slug, page }: { slug: string; page: number }) {
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [{ items, total, totalPages }, allCategories] = await Promise.all([
    getBusinessesByCategory(slug, page, PER_PAGE),
    getAllCategories(),
  ]);

  const name = decodeEntities(category.name);
  const categoryNames = new Map(allCategories.map((c) => [c.slug, c.name]));
  const group = getGroupForCategory(slug);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE.url },
          ...(group
            ? [{ name: group.name, url: absoluteUrl(`/business-category/${group.slug}`) }]
            : []),
          { name, url: absoluteUrl(`/business-category/${slug}`) },
        ])}
      />
      {items.length > 0 && (
        <JsonLd
          data={itemListJsonLd(
            items.map((b) => ({
              name: decodeEntities(b.name),
              url: absoluteUrl(`/business/${b.slug}`),
            })),
            `${name} in the UAE`,
          )}
        />
      )}

      <div className="border-b border-line bg-surface">
        <Container className="py-8">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              ...(group ? [{ label: group.name, href: `/business-category/${group.slug}` }] : []),
              { label: name },
            ]}
          />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {name} in the UAE
          </h1>
          <p className="mt-2 text-muted">
            {formatCount(total)} {total === 1 ? "business" : "businesses"} listed
          </p>
          <p className="mt-4 max-w-3xl leading-relaxed text-body">
            Browse {formatCount(total)} {name.toLowerCase()}{" "}
            {total === 1 ? "business" : "businesses"} across the UAE. Each listing includes
            Google ratings, reviews, opening hours, photos and direct contact options — ranked
            by the Easy Auto Score so you can compare trusted providers quickly.
          </p>
        </Container>
      </div>

      <Container className="py-10">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((b) => (
                <BusinessCard
                  key={b.id}
                  business={b}
                  categoryName={
                    b.category_slug && b.category_slug !== slug
                      ? categoryNames.get(b.category_slug)
                      : undefined
                  }
                />
              ))}
            </div>
            <Pagination basePath={`/business-category/${slug}`} page={page} totalPages={totalPages} />
          </>
        )}
      </Container>
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-12 text-center">
      <p className="text-lg font-semibold text-ink">No listings here yet</p>
      <p className="mt-1 text-muted">Check back soon — we&apos;re adding businesses regularly.</p>
    </div>
  );
}

function toPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
