import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BusinessCard } from "@/components/business-card";
import { JsonLd } from "@/components/json-ld";
import { LeadCapture } from "@/components/lead-capture";
import { getBusinessesByLocation } from "@/lib/data";
import { EMIRATES, getLocation } from "@/lib/locations";
import type { NearMeService } from "@/lib/near-me";
import { decodeEntities, formatCount } from "@/lib/format";
import { SITE, absoluteUrl } from "@/lib/site";
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd } from "@/lib/structured-data";

const PER_EMIRATE = 6;

export function nearMeMetadata(service: NearMeService): Metadata {
  const title = `${service.service} Near Me — Best in the UAE`;
  const description = `Find ${service.service.toLowerCase()} near you across the UAE. Compare top-rated specialists in Dubai, Abu Dhabi, Sharjah, Ajman and beyond by rating, reviews and the Easy Auto Score.`;
  const url = absoluteUrl(`/${service.slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

type EmirateBlock = {
  slug: string;
  name: string;
  total: number;
  items: Awaited<ReturnType<typeof getBusinessesByLocation>>["items"];
};

export async function NearMeLanding({ service }: { service: NearMeService }) {
  // One query per emirate (cached) — a single page answers "X near me" for the
  // whole country, then links down to each /<service>-in-<emirate> combo.
  const blocks: EmirateBlock[] = (
    await Promise.all(
      EMIRATES.map(async (e) => {
        const loc = getLocation(e.slug)!;
        const { items, total } = await getBusinessesByLocation(
          service.categorySlugs,
          loc,
          1,
          PER_EMIRATE,
        );
        return { slug: e.slug, name: e.name, total, items };
      }),
    )
  )
    .filter((b) => b.total > 0)
    .sort((a, b) => b.total - a.total);

  const total = blocks.reduce((n, b) => n + b.total, 0);
  const topItems = blocks.flatMap((b) => b.items).slice(0, 10);

  const faqs = [
    {
      question: `Where can I find ${service.query} in the UAE?`,
      answer: `Easy Auto lists ${formatCount(total)} ${service.service.toLowerCase()} ${total === 1 ? "provider" : "providers"} across ${blocks.length} ${blocks.length === 1 ? "emirate" : "emirates"} — including ${blocks.slice(0, 3).map((b) => b.name).join(", ")}. Each is ranked by the Easy Auto Score, built from real Google ratings, review volume and profile completeness.`,
    },
    {
      question: `How do I choose a good ${service.short.toLowerCase()} provider?`,
      answer: `${service.checklist.slice(0, 3).join(" ")}`,
    },
    {
      question: `How is each ${service.short.toLowerCase()} listing ranked?`,
      answer:
        "Listings are ordered by the Easy Auto Score — a blend of genuine Google ratings, the number of reviews and how complete the business profile is — so the most trusted, established providers surface first.",
    },
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE.url },
          { name: `${service.short} near me`, url: absoluteUrl(`/${service.slug}`) },
        ])}
      />
      <JsonLd data={faqJsonLd(faqs)} />
      {topItems.length > 0 && (
        <JsonLd
          data={itemListJsonLd(
            topItems.map((b) => ({
              name: decodeEntities(b.name),
              url: absoluteUrl(`/business/${b.slug}`),
            })),
            `${service.service} in the UAE`,
          )}
        />
      )}

      <div className="border-b border-line bg-surface">
        <Container className="py-8">
          <Breadcrumbs
            items={[{ label: "Home", href: "/" }, { label: `${service.short} near me` }]}
          />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {service.service} near me
          </h1>
          <p className="mt-2 text-muted">
            {formatCount(total)} {total === 1 ? "provider" : "providers"} across the UAE
          </p>
          <p className="mt-4 max-w-3xl leading-relaxed text-body">{service.intro}</p>
        </Container>
      </div>

      <Container className="py-8">
        {/* Adaptive lead funnel — context (service) drives the copy + attribution. */}
        <LeadCapture service={service.service} serviceSlug={service.primaryCategory} />

        {/* Jump links to each emirate. */}
        {blocks.length > 1 && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-faint">Jump to:</span>
            {blocks.map((b) => (
              <a
                key={b.slug}
                href={`#${b.slug}`}
                className="rounded-full border border-line bg-surface px-3 py-1 text-sm font-medium text-body hover:border-brand-300 hover:text-brand-700"
              >
                {b.name} ({formatCount(b.total)})
              </a>
            ))}
          </div>
        )}

        <div id="listings" className="mt-10 space-y-12">
          {blocks.map((b) => (
            <section key={b.slug} id={b.slug} className="scroll-mt-24">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-2xl font-bold text-ink">
                  {service.short} in {b.name}
                </h2>
                {b.total > b.items.length && (
                  <Link
                    href={`/${service.primaryCategory}-in-${b.slug}`}
                    className="shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700"
                  >
                    See all {formatCount(b.total)} →
                  </Link>
                )}
              </div>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {b.items.map((biz) => (
                  <BusinessCard key={biz.id} business={biz} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* What to check — unique, useful content. */}
        <section className="mt-14 max-w-3xl">
          <h2 className="text-2xl font-bold text-ink">
            What to check when choosing {service.service.toLowerCase()}
          </h2>
          <ul className="mt-5 space-y-3">
            {service.checklist.map((point) => (
              <li key={point} className="flex gap-3 text-body">
                <span aria-hidden className="mt-1 text-brand-600">✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Internal links — hub + per-emirate combos feed crawl depth. */}
        <section className="mt-14">
          <h2 className="text-xl font-bold text-ink">Browse {service.short.toLowerCase()} by area</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/business-category/${service.primaryCategory}`}
              className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-body hover:border-brand-300 hover:text-brand-700"
            >
              All {service.short.toLowerCase()} in the UAE
            </Link>
            {blocks.map((b) => (
              <Link
                key={b.slug}
                href={`/${service.primaryCategory}-in-${b.slug}`}
                className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-body hover:border-brand-300 hover:text-brand-700"
              >
                {service.short} in {b.name}
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ — unique content + eligible for FAQ rich results. */}
        <section className="mt-14 max-w-3xl">
          <h2 className="text-2xl font-bold text-ink">{service.service} near me — FAQs</h2>
          <dl className="mt-6 space-y-5">
            {faqs.map((f) => (
              <div key={f.question} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                <dt className="font-semibold text-ink">{f.question}</dt>
                <dd className="mt-2 text-body">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </Container>
    </>
  );
}
