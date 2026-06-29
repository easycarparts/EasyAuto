import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { GUIDES } from "@/lib/guides";
import { SITE, absoluteUrl } from "@/lib/site";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Car Care Guides — PPF, Ceramic, Detailing & Tint in the UAE",
  description:
    "Practical, UAE-focused guides on paint protection film, ceramic coating, detailing, window tint and wrapping — costs, comparisons and the rules you need to know.",
  alternates: { canonical: absoluteUrl("/guides") },
};

export default function GuidesIndexPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE.url },
          { name: "Guides", url: absoluteUrl("/guides") },
        ])}
      />
      <JsonLd
        data={itemListJsonLd(
          GUIDES.map((g) => ({ name: g.title, url: absoluteUrl(`/guides/${g.slug}`) })),
          "Car care guides for the UAE",
        )}
      />

      <div className="border-b border-line bg-surface">
        <Container className="py-8">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Guides" }]} />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Car care guides for the UAE
          </h1>
          <p className="mt-4 max-w-3xl leading-relaxed text-body">
            Straight answers on protecting and caring for your car in UAE conditions — what things cost,
            how options compare, and the local rules that apply. Each guide links you to specialists near you.
          </p>
        </Container>
      </div>

      <Container className="py-10">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {GUIDES.map((g) => (
            <Link
              key={g.slug}
              href={`/guides/${g.slug}`}
              className="group flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-pop"
            >
              <h2 className="text-lg font-bold text-ink group-hover:text-brand-600">{g.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-body">{g.description}</p>
              <span className="mt-4 text-sm font-semibold text-brand-600 group-hover:text-brand-700">
                Read guide →
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </>
  );
}
