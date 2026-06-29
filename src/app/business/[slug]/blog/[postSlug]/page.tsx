import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ArticleRelated } from "@/components/article-related";
import { JsonLd } from "@/components/json-ld";
import { getAllCategories, getBusinessBySlug } from "@/lib/data";
import { businessDirectoryLinks } from "@/lib/article-links";
import { findRelatedFeedItems, getMixedContentFeed } from "@/lib/content-feed";
import {
  blogIndexPath,
  getAllPublishedPostParams,
  getPublishedPost,
  getPublishedPostsForBusiness,
  postPublicPath,
} from "@/lib/post-data";
import { buildPostMetadata } from "@/lib/post-seo";
import { cleanPostHtml, decodeEntities } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbJsonLd, businessBlogPostingJsonLd } from "@/lib/structured-data";

export const revalidate = 3600;

export async function generateStaticParams() {
  return getAllPublishedPostParams();
}

export async function generateMetadata({
  params,
}: PageProps<"/business/[slug]/blog/[postSlug]">): Promise<Metadata> {
  const { slug, postSlug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) return { title: "Article not found" };
  const post = await getPublishedPost(business.id, postSlug);
  if (!post) return { title: "Article not found" };
  return buildPostMetadata(post, business);
}

export default async function BusinessBlogPostPage({
  params,
}: PageProps<"/business/[slug]/blog/[postSlug]">) {
  const { slug, postSlug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();

  const post = await getPublishedPost(business.id, postSlug);
  if (!post) notFound();

  const [categories, feed] = await Promise.all([getAllCategories(), getMixedContentFeed()]);
  const categoryName = business.category_slug
    ? categories.find((c) => c.slug === business.category_slug)?.name
    : undefined;

  const name = decodeEntities(business.name);
  const title = decodeEntities(post.title);
  const author = post.author_name?.trim() || name;
  const published = post.published_at ? new Date(post.published_at) : null;
  const modified = new Date(post.updated_at);
  const postHref = postPublicPath(slug, postSlug);

  const relatedFromFeed = findRelatedFeedItems(postHref, feed, {
    categorySlug: business.category_slug,
    limit: 3,
  });
  const directoryLinks = businessDirectoryLinks(business, categoryName);

  const related = (await getPublishedPostsForBusiness(business.id))
    .filter((p) => p.id !== post.id)
    .slice(0, 3);

  return (
    <>
      <JsonLd data={businessBlogPostingJsonLd(post, business)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name, url: absoluteUrl(`/business/${slug}`) },
          { name: "Guides & Articles", url: absoluteUrl(blogIndexPath(slug)) },
          { name: title, url: absoluteUrl(postPublicPath(slug, postSlug)) },
        ])}
      />

      <Container className="py-8">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: name, href: `/business/${slug}` },
            { label: "Guides & Articles", href: blogIndexPath(slug) },
            { label: title },
          ]}
        />
      </Container>

      <Container className="pb-16">
        <article className="mx-auto max-w-3xl" itemScope itemType="https://schema.org/BlogPosting">
          <meta itemProp="headline" content={title} />
          {post.published_at && <meta itemProp="datePublished" content={post.published_at} />}
          <meta itemProp="dateModified" content={post.updated_at} />
          <meta itemProp="author" content={author} />

          <header>
            <p className="text-sm font-semibold text-brand-600">
              <Link href={blogIndexPath(slug)} className="hover:text-brand-700">
                {name}
              </Link>
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl" itemProp="name">
              {title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span>
                By <span className="font-medium text-body">{author}</span>
              </span>
              {published && (
                <time dateTime={post.published_at!} itemProp="datePublished">
                  {published.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
              )}
              {published && modified.getTime() > published.getTime() + 86400000 && (
                <span className="text-faint">
                  Updated{" "}
                  <time dateTime={post.updated_at}>
                    {modified.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                </span>
              )}
            </div>
          </header>

          {post.cover_image_url && (
            <figure className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl border border-line">
              <Image
                src={post.cover_image_url}
                alt={post.cover_image_alt ?? title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                itemProp="image"
              />
              {post.cover_image_alt && (
                <figcaption className="sr-only">{post.cover_image_alt}</figcaption>
              )}
            </figure>
          )}

          {post.excerpt && (
            <p className="mt-8 text-lg font-medium leading-relaxed text-body" itemProp="description">
              {decodeEntities(post.excerpt)}
            </p>
          )}

          {post.content && (
            <div
              className="prose-article mt-8"
              itemProp="articleBody"
              dangerouslySetInnerHTML={{ __html: cleanPostHtml(post.content) }}
            />
          )}

          <footer className="mt-12 rounded-2xl border border-line bg-brand-50 p-6">
            <p className="font-semibold text-ink">About {name}</p>
            <p className="mt-2 text-sm text-muted">
              This article was published by{" "}
              <Link href={`/business/${slug}`} className="font-semibold text-brand-600 hover:text-brand-700">
                {name}
              </Link>
              {business.city ? ` in ${business.city}` : ""} on {absoluteUrl("").replace(/\/$/, "")}.
            </p>
            <Link
              href={`/business/${slug}`}
              className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              View business profile →
            </Link>
          </footer>
        </article>

        <ArticleRelated directoryLinks={directoryLinks} related={relatedFromFeed} />

        {related.length > 0 && (
          <aside className="mx-auto mt-14 max-w-3xl">
            <h2 className="text-lg font-bold text-ink">More from {name}</h2>
            <ul className="mt-4 space-y-3">
              {related.map((r) => (
                <li key={r.id}>
                  <Link
                    href={postPublicPath(slug, r.slug)}
                    className="block rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-brand-600 shadow-card hover:bg-brand-50"
                  >
                    {decodeEntities(r.title)} →
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </Container>
    </>
  );
}
