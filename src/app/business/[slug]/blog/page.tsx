import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { getBusinessBySlug } from "@/lib/data";
import {
  blogIndexPath,
  getPublishedPostsForBusiness,
  postPublicPath,
} from "@/lib/post-data";
import { buildBlogIndexMetadata } from "@/lib/post-seo";
import { decodeEntities } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbJsonLd, businessBlogIndexJsonLd } from "@/lib/structured-data";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: PageProps<"/business/[slug]/blog">): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) return { title: "Blog not found" };
  const posts = await getPublishedPostsForBusiness(business.id);
  if (posts.length === 0) return { title: "Blog not found", robots: { index: false } };
  return buildBlogIndexMetadata(business, posts.length);
}

export default async function BusinessBlogIndexPage({
  params,
}: PageProps<"/business/[slug]/blog">) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();

  const posts = await getPublishedPostsForBusiness(business.id);
  if (posts.length === 0) notFound();

  const name = decodeEntities(business.name);
  const crumbs = [
    { label: "Home", href: "/" },
    { label: name, href: `/business/${slug}` },
    { label: "Guides & Articles" },
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name, url: absoluteUrl(`/business/${slug}`) },
          { name: "Guides & Articles", url: absoluteUrl(blogIndexPath(slug)) },
        ])}
      />
      <JsonLd data={businessBlogIndexJsonLd(business, posts)} />

      <Container className="py-8">
        <Breadcrumbs items={crumbs} />
      </Container>

      <Container className="pb-16">
        <header className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            {name}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Guides &amp; Articles
          </h1>
          <p className="mt-3 text-lg text-muted">
            Expert tips and guides from {name}
            {business.city ? ` in ${business.city}` : ""}.
          </p>
        </header>

        <ul className="mx-auto mt-10 grid max-w-3xl gap-6">
          {posts.map((post) => {
            const href = postPublicPath(slug, post.slug);
            const published = post.published_at ? new Date(post.published_at) : null;
            return (
              <li key={post.id}>
                <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition hover:border-brand-300">
                  <Link href={href} className="block sm:flex">
                    {post.cover_image_url && (
                      <div className="relative aspect-[16/9] shrink-0 sm:w-56 sm:aspect-auto sm:min-h-[140px]">
                        <Image
                          src={post.cover_image_url}
                          alt={post.cover_image_alt ?? post.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 224px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col justify-center p-5">
                      <h2 className="text-xl font-bold text-ink hover:text-brand-700">
                        {decodeEntities(post.title)}
                      </h2>
                      {post.excerpt && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted">
                          {decodeEntities(post.excerpt)}
                        </p>
                      )}
                      {published && (
                        <time
                          dateTime={post.published_at!}
                          className="mt-3 text-xs font-medium text-faint"
                        >
                          {published.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </time>
                      )}
                      <span className="mt-3 text-sm font-semibold text-brand-600">
                        Read article →
                      </span>
                    </div>
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
      </Container>
    </>
  );
}
