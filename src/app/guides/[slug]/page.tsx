import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { getGuide, guideSlugs } from "@/lib/guides";
import { SITE, absoluteUrl } from "@/lib/site";
import { breadcrumbJsonLd, faqJsonLd, siteArticleJsonLd } from "@/lib/structured-data";

export function generateStaticParams() {
  return guideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "Guide not found" };
  const url = absoluteUrl(`/guides/${slug}`);
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: url },
    openGraph: { title: guide.title, description: guide.description, url, type: "article" },
  };
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const url = absoluteUrl(`/guides/${slug}`);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE.url },
          { name: "Guides", url: absoluteUrl("/guides") },
          { name: guide.title, url },
        ])}
      />
      <JsonLd
        data={siteArticleJsonLd({
          url,
          headline: guide.title,
          description: guide.description,
          datePublished: guide.updated,
          dateModified: guide.updated,
        })}
      />
      <JsonLd data={faqJsonLd(guide.faqs)} />

      <div className="border-b border-line bg-surface">
        <Container className="py-8">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Guides", href: "/guides" },
              { label: guide.title },
            ]}
          />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {guide.title}
          </h1>
          <p className="mt-4 max-w-3xl leading-relaxed text-body">{guide.intro}</p>
        </Container>
      </div>

      <Container className="py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <article className="lg:col-span-2 max-w-3xl space-y-10">
            {guide.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-2xl font-bold text-ink">{s.heading}</h2>
                {s.body.map((p, i) => (
                  <p key={i} className="mt-3 leading-relaxed text-body">
                    {p}
                  </p>
                ))}
              </section>
            ))}

            <section>
              <h2 className="text-2xl font-bold text-ink">FAQs</h2>
              <dl className="mt-6 space-y-5">
                {guide.faqs.map((f) => (
                  <div key={f.question} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                    <dt className="font-semibold text-ink">{f.question}</dt>
                    <dd className="mt-2 text-body">{f.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <p className="text-xs text-faint">
              Prices are indicative AED ranges and vary by vehicle, condition and provider. Where
              regulations are mentioned, confirm the current rules with the RTA — this guide is general
              information, not legal or pricing advice.
            </p>
          </article>

          <aside className="lg:col-span-1">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card lg:sticky lg:top-24">
              <h2 className="text-base font-bold text-ink">Related</h2>
              <ul className="mt-3 space-y-2">
                {guide.related.map((r) => (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                    >
                      {r.label} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
