import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ArticleFeedCard } from "@/components/article-feed-card";
import { JsonLd } from "@/components/json-ld";
import { getMixedContentFeed } from "@/lib/content-feed";
import { absoluteUrl } from "@/lib/site";
import { itemListJsonLd } from "@/lib/structured-data";
import { decodeEntities } from "@/lib/format";
import { SITE } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "News & guides",
  description: `Auto-care guides, buying advice and business articles for the UAE from ${SITE.name}.`,
  alternates: { canonical: absoluteUrl("/news") },
};

export default async function NewsIndexPage() {
  const feed = await getMixedContentFeed();
  const editorial = feed.filter((f) => f.kind === "editorial");
  const business = feed.filter((f) => f.kind === "business");

  return (
    <>
      {feed.length > 0 && (
        <JsonLd
          data={itemListJsonLd(
            feed.map((f) => ({ name: decodeEntities(f.title), url: absoluteUrl(f.href) })),
            "News & guides",
          )}
        />
      )}

      <div className="border-b border-line bg-surface">
        <Container className="py-8">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "News" }]} />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            News &amp; guides
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            Editorial guides plus articles from verified UAE auto businesses on Easy Auto.
          </p>
        </Container>
      </div>

      <Container className="py-10">
        {feed.length === 0 ? (
          <p className="text-muted">No articles yet.</p>
        ) : (
          <div className="space-y-12">
            {editorial.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-ink">Editorial</h2>
                <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {editorial.map((item) => (
                    <ArticleFeedCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}

            {business.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-ink">From the directory</h2>
                <p className="mt-1 text-sm text-muted">
                  Guides published by businesses on Easy Auto — each links to the original article.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {business.map((item) => (
                    <ArticleFeedCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </Container>
    </>
  );
}
