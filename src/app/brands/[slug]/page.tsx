import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BusinessCard } from "@/components/business-card";
import { JsonLd } from "@/components/json-ld";
import { LeadCapture } from "@/components/lead-capture";
import { getBusinessesByCategory } from "@/lib/data";
import { getBrand, brandSlugs } from "@/lib/brands";
import { formatCount } from "@/lib/format";
import { SITE, absoluteUrl } from "@/lib/site";
import { breadcrumbJsonLd, siteArticleJsonLd } from "@/lib/structured-data";

export function generateStaticParams() {
  return brandSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/brands/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const brand = getBrand(slug);
  if (!brand) return { title: "Brand not found" };
  const title = `${brand.name} ${brand.serviceLabel} in the UAE — Tiers, Warranty & Installers`;
  const description = `${brand.name} ${brand.type.toLowerCase()} in the UAE: what it is, product tiers, warranty and where to find installers. ${brand.positioning}.`;
  const url = absoluteUrl(`/brands/${slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

export default async function BrandPage({ params }: PageProps<"/brands/[slug]">) {
  const { slug } = await params;
  const brand = getBrand(slug);
  if (!brand) notFound();

  // Real inventory for the brand's service category — gives the page genuine
  // internal links and listings to act on (we don't claim these shops fit this
  // specific brand; brand-level data is sparse, so we surface the service category).
  const { items, total } = await getBusinessesByCategory(brand.serviceCategory, 1, 6);
  const url = absoluteUrl(`/brands/${slug}`);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE.url },
          { name: "Brands", url: absoluteUrl("/brands") },
          { name: brand.name, url },
        ])}
      />
      <JsonLd
        data={siteArticleJsonLd({
          url,
          headline: `${brand.name} ${brand.serviceLabel} in the UAE`,
          description: brand.summary,
        })}
      />

      <div className="border-b border-line bg-surface">
        <Container className="py-8">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Brands", href: "/brands" },
              { label: brand.name },
            ]}
          />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {brand.name} {brand.serviceLabel} in the UAE
          </h1>
          <p className="mt-2 text-sm font-medium text-faint">{brand.type}</p>
          <p className="mt-4 max-w-3xl leading-relaxed text-body">{brand.summary}</p>
        </Container>
      </div>

      <Container className="py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-10">
            {/* Key facts */}
            <section>
              <h2 className="text-xl font-bold text-ink">At a glance</h2>
              <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
                <FactRow label="Type" value={brand.type} />
                <FactRow label="Origin" value={brand.origin} />
                <FactRow label="Positioning" value={brand.positioning} />
                <FactRow label="Warranty" value={brand.warranty} />
                <FactRow label="In the UAE" value={brand.uaePresence} />
              </dl>
            </section>

            {/* Product tiers */}
            <section>
              <h2 className="text-xl font-bold text-ink">Product range</h2>
              <ul className="mt-4 space-y-3">
                {brand.tiers.map((t) => (
                  <li key={t.name} className="rounded-2xl border border-line bg-surface p-4">
                    <p className="font-semibold text-ink">{t.name}</p>
                    <p className="mt-1 text-sm text-body">{t.note}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-faint">
                Product, warranty and pricing details reflect manufacturer and authorised-installer
                information and can vary by region — confirm exact terms with a UAE distributor before
                purchase.
              </p>
            </section>

            {/* Real listings */}
            {items.length > 0 && (
              <section>
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-xl font-bold text-ink">
                    {brand.serviceLabel.charAt(0).toUpperCase() + brand.serviceLabel.slice(1)} specialists in the UAE
                  </h2>
                  <Link
                    href={`/business-category/${brand.serviceCategory}`}
                    className="shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700"
                  >
                    See all {formatCount(total)} →
                  </Link>
                </div>
                <p className="mt-1 text-sm text-muted">
                  Easy Auto lists {formatCount(total)} {brand.serviceLabel} specialists across the UAE — ask any of them which films or coatings they fit.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((b) => (
                    <BusinessCard key={b.id} business={b} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar — find specialists */}
          <aside className="lg:col-span-1 space-y-5">
            <div className="lg:sticky lg:top-24 space-y-5">
            <LeadCapture
              service={brand.serviceLabel}
              serviceSlug={brand.serviceCategory}
              variant="card"
            />
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <h2 className="text-base font-bold text-ink">Find {brand.serviceLabel} near you</h2>
              <p className="mt-2 text-sm text-body">
                Compare top-rated {brand.serviceLabel} specialists across the emirates.
              </p>
              <div className="mt-4 space-y-2">
                <Link
                  href={`/${brand.nearMeSlug}`}
                  className="flex h-11 w-full items-center justify-center rounded-xl bg-brand-600 font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  {brand.serviceLabel.charAt(0).toUpperCase() + brand.serviceLabel.slice(1)} near me
                </Link>
                <Link
                  href={`/business-category/${brand.serviceCategory}`}
                  className="flex h-11 w-full items-center justify-center rounded-xl border border-line bg-surface font-semibold text-body transition-colors hover:border-brand-300 hover:text-brand-700"
                >
                  Browse all in the UAE
                </Link>
              </div>
            </div>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 p-4 sm:grid-cols-4 sm:gap-4">
      <dt className="text-sm font-semibold text-faint">{label}</dt>
      <dd className="text-sm text-body sm:col-span-3">{value}</dd>
    </div>
  );
}
