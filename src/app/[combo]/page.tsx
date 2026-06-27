import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BusinessCard } from "@/components/business-card";
import { Pagination } from "@/components/pagination";
import { JsonLd } from "@/components/json-ld";
import {
  getAllCategories,
  getBusinessesByLocation,
  getLocationFacets,
} from "@/lib/data";
import {
  ALL_SERVICES,
  SERVICE_GROUPS,
  resolveService,
} from "@/lib/taxonomy";
import { COMMUNITIES, getEmirate, getLocation } from "@/lib/locations";
import { computeLocationCombos } from "@/lib/location-combos";
import { decodeEntities, formatCount } from "@/lib/format";
import { SITE, absoluteUrl } from "@/lib/site";
import { breadcrumbJsonLd } from "@/lib/structured-data";

const PER_PAGE = 24;
const MIN_LISTINGS = 3; // don't build thin pages

// Split "<service>-in-<location>" on the LAST "-in-" (location is the tail).
function parseCombo(combo: string): { service: string; location: string } | null {
  const i = combo.lastIndexOf("-in-");
  if (i < 1) return null;
  const service = combo.slice(0, i);
  const location = combo.slice(i + 4);
  if (!service || !location) return null;
  return { service, location };
}

export async function generateStaticParams() {
  const [facets, categories] = await Promise.all([
    getLocationFacets(),
    getAllCategories(),
  ]);
  const topCats = new Set(categories.slice(0, 15).map((c) => c.slug));
  return computeLocationCombos(facets, topCats, MIN_LISTINGS).map((combo) => ({ combo }));
}

async function resolve(combo: string) {
  const parsed = parseCombo(combo);
  if (!parsed) return null;
  const location = getLocation(parsed.location);
  if (!location) return null;
  const categories = await getAllCategories();
  const service = resolveService(parsed.service, categories);
  if (!service) return null;
  return { location, service };
}

export async function generateMetadata({
  params,
}: PageProps<"/[combo]">): Promise<Metadata> {
  const { combo } = await params;
  const r = await resolve(combo);
  if (!r) return { title: "Not found" };
  const serviceName = decodeEntities(r.service.name);
  const title = `${serviceName} in ${r.location.name}`;
  const description = `Find the best ${serviceName.toLowerCase()} in ${r.location.name}, UAE. Compare ratings, reviews, locations and contact details on ${SITE.name}.`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/${combo}`) },
    openGraph: { title, description, url: absoluteUrl(`/${combo}`) },
  };
}

export default async function LocationServicePage({
  params,
  searchParams,
}: PageProps<"/[combo]">) {
  const { combo } = await params;
  const sp = await searchParams;
  const page = toPage(sp.page);

  const r = await resolve(combo);
  if (!r) notFound();
  const { location, service } = r;

  const { items, total, totalPages } = await getBusinessesByLocation(
    service.categorySlugs,
    location,
    page,
    PER_PAGE,
  );
  if (total === 0) notFound();

  const allCategories = await getAllCategories();
  const categoryNames = new Map(allCategories.map((c) => [c.slug, c.name]));
  const serviceName = decodeEntities(service.name);
  const emirate = location.kind === "emirate" ? location : getEmirate(location.emirate);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE.url },
          { name: location.name, url: absoluteUrl(`/${ALL_SERVICES.slug}-in-${location.slug}`) },
          { name: serviceName, url: absoluteUrl(`/${combo}`) },
        ])}
      />

      <div className="border-b border-line bg-surface">
        <Container className="py-8">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: location.name, href: `/${ALL_SERVICES.slug}-in-${location.slug}` },
              { label: serviceName },
            ]}
          />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {serviceName} in {location.name}
          </h1>
          <p className="mt-2 text-muted">
            {formatCount(total)} {total === 1 ? "business" : "businesses"}
            {location.kind === "community" && emirate ? `, ${emirate.name}` : ""}
            {" · UAE"}
          </p>
        </Container>
      </div>

      <Container className="py-10">
        {/* Other services in this location */}
        <FilterRow
          label="Service"
          items={[
            { slug: `${ALL_SERVICES.slug}-in-${location.slug}`, name: "All", active: service.slug === ALL_SERVICES.slug },
            ...SERVICE_GROUPS.map((g) => ({
              slug: `${g.slug}-in-${location.slug}`,
              name: g.name,
              active: service.slug === g.slug,
            })),
          ]}
        />

        {/* Communities within this emirate (only on emirate pages) */}
        {location.kind === "emirate" && (
          <CommunityRow emirateSlug={location.slug} serviceSlug={service.slug} />
        )}

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((b) => (
            <BusinessCard
              key={b.id}
              business={b}
              categoryName={b.category_slug ? categoryNames.get(b.category_slug) : undefined}
            />
          ))}
        </div>
        <Pagination basePath={`/${combo}`} page={page} totalPages={totalPages} />

        {/* Link out to the same service across the whole UAE */}
        {service.slug !== ALL_SERVICES.slug && (
          <p className="mt-10 text-sm text-muted">
            Looking wider?{" "}
            <Link
              href={`/business-category/${service.slug}`}
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              See {serviceName.toLowerCase()} across the whole UAE →
            </Link>
          </p>
        )}
      </Container>
    </>
  );
}

function FilterRow({
  label,
  items,
}: {
  label: string;
  items: { slug: string; name: string; active: boolean }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-faint">{label}:</span>
      {items.map((it) => (
        <Link
          key={it.slug}
          href={`/${it.slug}`}
          className={
            it.active
              ? "rounded-full border border-brand-600 bg-brand-600 px-3 py-1 text-sm font-medium text-white"
              : "rounded-full border border-line bg-surface px-3 py-1 text-sm font-medium text-body hover:border-brand-300 hover:text-brand-700"
          }
        >
          {decodeEntities(it.name)}
        </Link>
      ))}
    </div>
  );
}

function CommunityRow({
  emirateSlug,
  serviceSlug,
}: {
  emirateSlug: string;
  serviceSlug: string;
}) {
  const communities = COMMUNITIES.filter((c) => c.emirate === emirateSlug);
  if (communities.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-faint">Area:</span>
      {communities.map((c) => (
        <Link
          key={c.slug}
          href={`/${serviceSlug}-in-${c.slug}`}
          className="rounded-full border border-line bg-surface px-3 py-1 text-sm font-medium text-body hover:border-brand-300 hover:text-brand-700"
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}

function toPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
