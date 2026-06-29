import Link from "next/link";
import { Container } from "@/components/container";
import { SearchBar } from "@/components/search-bar";
import { BusinessCard } from "@/components/business-card";
import { ArticleFeedCard } from "@/components/article-feed-card";
import { JsonLd } from "@/components/json-ld";
import { GeolocateButton } from "@/components/geolocate-button";
import {
  getAllCategories,
  getCities,
  getFeaturedBusinesses,
} from "@/lib/data";
import { getRecentContentFeed } from "@/lib/content-feed";
import { SERVICE_GROUPS, ALL_SERVICES } from "@/lib/taxonomy";
import { EMIRATES, emirateForCity } from "@/lib/locations";
import { formatCount } from "@/lib/format";
import { websiteJsonLd } from "@/lib/structured-data";

// Regenerate daily so the featured rotation refreshes (ISR).
export const revalidate = 86400;

export default async function Home() {
  const [categories, featured, cities, recentArticles] = await Promise.all([
    getAllCategories(),
    getFeaturedBusinesses(8),
    getCities(),
    getRecentContentFeed(3),
  ]);

  const categoryNames = new Map(categories.map((c) => [c.slug, c.name]));
  const countBySlug = new Map(categories.map((c) => [c.slug, c.listing_count]));
  const totalListings = categories.reduce((sum, c) => sum + c.listing_count, 0);

  // The 9 service groups with aggregated counts (Step 3 taxonomy).
  const groups = SERVICE_GROUPS.map((g) => ({
    ...g,
    count: g.members.reduce((sum, m) => sum + (countBySlug.get(m) ?? 0), 0),
  }));

  // Listing counts per emirate (normalise raw city names → emirate).
  const emirateCounts = new Map<string, number>();
  for (const { city, count } of cities) {
    const e = emirateForCity(city);
    if (e) emirateCounts.set(e.slug, (emirateCounts.get(e.slug) ?? 0) + count);
  }
  const emirates = EMIRATES.map((e) => ({ ...e, count: emirateCounts.get(e.slug) ?? 0 })).sort(
    (a, b) => b.count - a.count,
  );

  return (
    <>
      <JsonLd data={websiteJsonLd()} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-brand-50 to-canvas">
        <Container className="py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-surface px-3 py-1 text-sm font-medium text-brand-700 shadow-sm">
              {formatCount(totalListings)}+ auto businesses across the UAE
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              Find trusted auto services near you
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
              Car wash, detailing, auto parts, towing, repair and more — compare
              ratings and reviews, then book in a tap.
            </p>
            <div className="mx-auto mt-8 max-w-xl">
              <SearchBar size="lg" />
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm text-muted">
              <span className="text-faint">Popular:</span>
              <PopularLink slug="car-wash">Car wash</PopularLink>
              <PopularLink slug="car-detailing-service">Detailing</PopularLink>
              <PopularLink slug="window-tinting-service">Window tint</PopularLink>
              <PopularLink slug="towing-service">Towing</PopularLink>
            </div>

            <div className="mt-6 flex flex-col items-center gap-4">
              <GeolocateButton label="Find services near me" />
              <div className="flex flex-wrap justify-center gap-2">
                {emirates.map((e) => (
                  <Link
                    key={e.slug}
                    href={`/${ALL_SERVICES.slug}-in-${e.slug}`}
                    className="rounded-full border border-line bg-surface/70 px-3 py-1 text-sm font-medium text-body hover:border-brand-300 hover:text-brand-700"
                  >
                    {e.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Service groups */}
      <Container className="py-14">
        <SectionHeading title="Browse by service" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link
              key={g.slug}
              href={`/business-category/${g.slug}`}
              className="group flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-ink group-hover:text-brand-700">{g.name}</h3>
                <span className="rounded-full bg-canvas px-2.5 py-0.5 text-xs font-semibold text-muted">
                  {formatCount(g.count)}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-muted">{g.tagline}</p>
            </Link>
          ))}
        </div>
      </Container>

      {/* Featured listings */}
      <section className="bg-surface py-14">
        <Container>
          <SectionHeading title="Featured businesses" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((b) => (
              <BusinessCard
                key={b.id}
                business={b}
                categoryName={
                  b.category_slug
                    ? categoryNames.get(b.category_slug)
                    : undefined
                }
              />
            ))}
          </div>
        </Container>
      </section>

      {/* Browse by emirate */}
      <Container className="py-14">
        <SectionHeading title="Browse by emirate" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {emirates.map((e) => (
            <Link
              key={e.slug}
              href={`/${ALL_SERVICES.slug}-in-${e.slug}`}
              className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3.5 text-sm shadow-card transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <span className="font-semibold text-ink">{e.name}</span>
              <span className="text-muted">{formatCount(e.count)}</span>
            </Link>
          ))}
        </div>
      </Container>

      {/* News teaser */}
      {recentArticles.length > 0 && (
        <section className="bg-surface py-14">
          <Container>
            <SectionHeading title="Guides & news" action={{ href: "/news", label: "All articles" }} />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recentArticles.map((item) => (
                <ArticleFeedCard key={item.id} item={item} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}

function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="text-2xl font-bold tracking-tight text-ink">{title}</h2>
      {action?.label && (
        <Link href={action.href} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
          {action.label} →
        </Link>
      )}
    </div>
  );
}

function PopularLink({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <Link
      href={`/business-category/${slug}`}
      className="rounded-full border border-line bg-surface px-3 py-1 font-medium text-body hover:border-brand-300 hover:text-brand-700"
    >
      {children}
    </Link>
  );
}
