import type { Metadata } from "next";
import type { Business, BusinessPost } from "./types";
import { decodeEntities, stripHtml, truncate } from "./format";
import { SITE, absoluteUrl } from "./site";
import { blogIndexPath, postPublicPath } from "./post-data";

export function postSeoTitle(post: BusinessPost, business: Business): string {
  const meta = post.meta_title?.trim();
  if (meta) return meta;
  return `${decodeEntities(post.title)} | ${decodeEntities(business.name)}`;
}

export function postSeoDescription(post: BusinessPost): string {
  if (post.meta_description?.trim()) return post.meta_description.trim();
  if (post.excerpt?.trim()) return decodeEntities(post.excerpt);
  if (post.content) return truncate(stripHtml(post.content), 160);
  return `${decodeEntities(post.title)} — article on ${SITE.name}.`;
}

export function postOgImage(post: BusinessPost, business: Business): string | undefined {
  return post.og_image_url ?? post.cover_image_url ?? business.thumbnail_url ?? undefined;
}

export function buildPostMetadata(post: BusinessPost, business: Business): Metadata {
  const title = postSeoTitle(post, business);
  const description = postSeoDescription(post);
  const url = absoluteUrl(postPublicPath(business.slug, post.slug));
  const image = postOgImage(post, business);

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: post.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: SITE.name,
      locale: SITE.locale,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: [post.author_name?.trim() || business.name],
      images: image ? [{ url: image, alt: post.cover_image_alt ?? post.title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function buildBlogIndexMetadata(business: Business, postCount: number): Metadata {
  const title = `Guides & Articles by ${decodeEntities(business.name)}`;
  const description = `Read ${postCount} article${postCount === 1 ? "" : "s"} from ${decodeEntities(business.name)}${business.city ? ` in ${business.city}` : ""}. Tips, guides and news from a trusted UAE auto business on ${SITE.name}.`;
  const url = absoluteUrl(blogIndexPath(business.slug));

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: SITE.name,
      images: business.thumbnail_url ? [{ url: business.thumbnail_url }] : undefined,
    },
    twitter: {
      card: business.thumbnail_url ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}
