import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getAllNews } from "@/lib/data";
import { decodeEntities, stripHtml, truncate } from "@/lib/format";
import { SITE, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "News & guides",
  description: `Auto-care guides, buying advice and industry news for the UAE from ${SITE.name}.`,
  alternates: { canonical: absoluteUrl("/news") },
};

export default async function NewsIndexPage() {
  const posts = await getAllNews();

  return (
    <>
      <div className="border-b border-line bg-surface">
        <Container className="py-8">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "News" }]} />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            News &amp; guides
          </h1>
          <p className="mt-2 text-muted">
            Practical advice on car care, parts and services in the UAE.
          </p>
        </Container>
      </div>

      <Container className="py-10">
        {posts.length === 0 ? (
          <p className="text-muted">No articles yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => {
              const blurb = post.excerpt
                ? decodeEntities(post.excerpt)
                : post.content
                  ? truncate(stripHtml(post.content), 160)
                  : "";
              return (
                <Link
                  key={post.id}
                  href={`/news/${post.slug}`}
                  className="flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-card transition-shadow hover:shadow-pop"
                >
                  <h2 className="font-bold text-ink">{decodeEntities(post.title)}</h2>
                  {blurb && <p className="mt-2 line-clamp-3 text-sm text-muted">{blurb}</p>}
                  <span className="mt-4 text-sm font-semibold text-brand-600">
                    Read article →
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Container>
    </>
  );
}
