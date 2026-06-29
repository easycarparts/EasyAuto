import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { BRANDS } from "@/lib/brands";
import { SITE, absoluteUrl } from "@/lib/site";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "PPF, Ceramic Coating & Tint Brands in the UAE",
  description:
    "A guide to the major paint protection film, ceramic coating and window-film brands available in the UAE — XPEL, Ceramic Pro, 3M, V-KOOL, Gtechniq and more — with product tiers, warranties and where to find installers.",
  alternates: { canonical: absoluteUrl("/brands") },
};

const GROUPS: { heading: string; type: string }[] = [
  { heading: "Paint protection film (PPF)", type: "Paint protection film" },
  { heading: "Ceramic coatings", type: "Ceramic coating" },
  { heading: "Window film & tint", type: "Window film" },
];

export default function BrandsIndexPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE.url },
          { name: "Brands", url: absoluteUrl("/brands") },
        ])}
      />
      <JsonLd
        data={itemListJsonLd(
          BRANDS.map((b) => ({ name: b.name, url: absoluteUrl(`/brands/${b.slug}`) })),
          "PPF, ceramic & tint brands in the UAE",
        )}
      />

      <div className="border-b border-line bg-surface">
        <Container className="py-8">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Brands" }]} />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Car protection brands in the UAE
          </h1>
          <p className="mt-4 max-w-3xl leading-relaxed text-body">
            Choosing paint protection film, a ceramic coating or window tint usually starts with the
            brand. These guides explain what each major brand is, its product tiers and warranty, and
            how it&apos;s represented in the UAE — then point you to specialists near you.
          </p>
        </Container>
      </div>

      <Container className="py-10 space-y-12">
        {GROUPS.map((group) => {
          const brands = BRANDS.filter((b) => b.type.startsWith(group.type));
          if (brands.length === 0) return null;
          return (
            <section key={group.heading}>
              <h2 className="mb-4 text-xl font-bold text-ink">{group.heading}</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {brands.map((b) => (
                  <Link
                    key={b.slug}
                    href={`/brands/${b.slug}`}
                    className="group flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-pop"
                  >
                    <h3 className="text-lg font-bold text-ink group-hover:text-brand-600">{b.name}</h3>
                    <p className="mt-1 text-sm font-medium text-faint">{b.type}</p>
                    <p className="mt-3 line-clamp-3 text-sm text-body">{b.summary}</p>
                    <span className="mt-4 text-sm font-semibold text-brand-600 group-hover:text-brand-700">
                      Read the {b.name} guide →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </Container>
    </>
  );
}
