import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { getAllNews, getNewsBySlug } from "@/lib/data";
import { cleanPostHtml, decodeEntities, stripHtml, truncate } from "@/lib/format";
import { SITE, absoluteUrl } from "@/lib/site";

export async function generateStaticParams() {
  const posts = await getAllNews();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/news/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNewsBySlug(slug);
  if (!post) return { title: "Article not found" };

  const title = decodeEntities(post.title);
  const description = post.excerpt
    ? decodeEntities(post.excerpt)
    : post.content
      ? truncate(stripHtml(post.content), 160)
      : SITE.description;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/news/${slug}`) },
    openGraph: {
      type: "article",
      title,
      description,
      url: absoluteUrl(`/news/${slug}`),
      images: post.thumbnail_url ? [{ url: post.thumbnail_url }] : undefined,
    },
  };
}

export default async function NewsPostPage({
  params,
}: PageProps<"/news/[slug]">) {
  const { slug } = await params;
  const post = await getNewsBySlug(slug);
  if (!post) notFound();

  const title = decodeEntities(post.title);
  const published = post.published_at ? new Date(post.published_at) : null;

  const articleJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    url: absoluteUrl(`/news/${slug}`),
    publisher: { "@type": "Organization", name: SITE.name },
  };
  if (post.thumbnail_url) articleJsonLd.image = post.thumbnail_url;
  if (post.published_at) articleJsonLd.datePublished = post.published_at;

  return (
    <>
      <JsonLd data={articleJsonLd} />

      <Container className="py-8">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "News", href: "/news" },
            { label: title },
          ]}
        />
      </Container>

      <Container className="pb-16">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {title}
          </h1>
          {published && (
            <p className="mt-3 text-sm text-muted">
              {published.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
          {post.content && (
            <div
              className="prose-article mt-8"
              dangerouslySetInnerHTML={{ __html: cleanPostHtml(post.content) }}
            />
          )}
        </article>
      </Container>
    </>
  );
}
