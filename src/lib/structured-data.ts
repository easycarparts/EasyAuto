// Builders for schema.org JSON-LD. Kept separate so pages stay readable and the
// shapes are reusable. We have rating, address, geo and hours → LocalBusiness is
// eligible for rich results.

import type { Business, BusinessPost } from "./types";
import { businessSameAs } from "./business-same-as";
import { openingHoursSpecification, openingHoursStrings } from "./hours-schema";
import { postPublicPath } from "./post-data";
import { SITE, absoluteUrl } from "./site";
import { decodeEntities, stripHtml } from "./format";

export function localBusinessJsonLd(
  business: Business,
  categoryName?: string,
): Record<string, unknown> {
  const listingUrl = absoluteUrl(`/business/${business.slug}`);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": listingUrl,
    name: business.name,
    url: listingUrl,
  };

  if (categoryName) data.description = `${decodeEntities(categoryName)} in ${business.city ?? "the UAE"}.`;
  if (business.description) data.description = stripHtml(business.description).slice(0, 300);
  if (business.thumbnail_url) data.image = business.thumbnail_url;
  if (business.phone) data.telephone = business.phone;
  if (business.email) data.email = business.email;

  const sameAs = businessSameAs(business);
  if (sameAs.length > 0) data.sameAs = sameAs;

  if (business.address) {
    data.address = {
      "@type": "PostalAddress",
      streetAddress: business.address,
      addressLocality: business.city ?? undefined,
      addressCountry: "AE",
    };
  }

  if (business.latitude != null && business.longitude != null) {
    data.geo = {
      "@type": "GeoCoordinates",
      latitude: business.latitude,
      longitude: business.longitude,
    };
  }

  const hoursSpec = openingHoursSpecification(business.hours);
  if (hoursSpec) {
    data.openingHoursSpecification = hoursSpec;
  } else {
    const hoursLines = openingHoursStrings(business.hours);
    if (hoursLines) data.openingHours = hoursLines;
  }

  // NOTE: We intentionally do NOT emit aggregateRating / review here. Those ratings
  // and reviews are Google's (third-party), and Google's structured-data policy
  // requires review markup to be first-party (sourced from our own users). Marking
  // up third-party reviews to fish for star rich results risks a manual action —
  // and Google already isn't granting the stars (empty Search-appearance report).
  // The rating still shows to users on-page; re-introduce schema here only when we
  // collect genuine first-party reviews.

  if (business.updated_at) data.dateModified = business.updated_at;

  return data;
}

export function breadcrumbJsonLd(
  items: { name: string; url: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// FAQPage — eligible for FAQ rich results in Google. Use on category/location hubs
// to win more SERP real estate and add unique, crawlable content.
export function faqJsonLd(
  items: { question: string; answer: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}

export function itemListJsonLd(
  items: { name: string; url: string }[],
  listName?: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    ...(listName ? { name: listName } : {}),
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function editorialArticleJsonLd(post: {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
}): Record<string, unknown> {
  const url = absoluteUrl(`/news/${post.slug}`);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": url,
    headline: post.title,
    url,
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
    author: { "@type": "Organization", name: SITE.name, url: SITE.url },
  };
  if (post.excerpt) data.description = stripHtml(post.excerpt).slice(0, 300);
  else if (post.content) data.description = stripHtml(post.content).slice(0, 300);
  if (post.thumbnail_url) data.image = [post.thumbnail_url];
  if (post.published_at) data.datePublished = post.published_at;
  return data;
}

// Generic first-party Article — for the /guides cluster and /brands pages. The
// site is the author/publisher (these are editorial, not per-business). Keeps the
// content eligible for Article rich results without claiming third-party authorship.
export function siteArticleJsonLd(args: {
  url: string;
  headline: string;
  description?: string;
  datePublished?: string;
  dateModified?: string;
}): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": args.url,
    headline: args.headline,
    url: args.url,
    mainEntityOfPage: { "@type": "WebPage", "@id": args.url },
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
    author: { "@type": "Organization", name: SITE.name, url: SITE.url },
  };
  if (args.description) data.description = args.description;
  if (args.datePublished) data.datePublished = args.datePublished;
  if (args.dateModified) data.dateModified = args.dateModified;
  return data;
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function businessBlogPostingJsonLd(
  post: BusinessPost,
  business: Business,
): Record<string, unknown> {
  const url = absoluteUrl(postPublicPath(business.slug, post.slug));
  const headline = post.meta_title?.trim() || post.title;
  const description =
    post.meta_description?.trim() ||
    post.excerpt?.trim() ||
    (post.content ? stripHtml(post.content).slice(0, 160) : undefined);
  const image = post.og_image_url || post.cover_image_url || business.thumbnail_url || undefined;
  const author = post.author_name?.trim() || business.name;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": url,
    headline,
    name: post.title,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: {
      "@type": "Organization",
      name: author,
      url: absoluteUrl(`/business/${business.slug}`),
    },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
    isPartOf: {
      "@type": "Blog",
      name: `${business.name} — Guides & Articles`,
      url: absoluteUrl(`/business/${business.slug}/blog`),
    },
    about: {
      "@type": "LocalBusiness",
      name: business.name,
      url: absoluteUrl(`/business/${business.slug}`),
    },
  };

  if (description) data.description = description;
  if (image) data.image = [image];
  if (post.published_at) data.datePublished = post.published_at;
  if (post.updated_at) data.dateModified = post.updated_at;
  if (post.excerpt) data.abstract = post.excerpt;

  return data;
}

export function businessBlogIndexJsonLd(
  business: Business,
  posts: { title: string; slug: string; published_at: string | null }[],
): Record<string, unknown> {
  const url = absoluteUrl(`/business/${business.slug}/blog`);
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": url,
    name: `${business.name} — Guides & Articles`,
    url,
    description: `Articles and guides from ${business.name}${business.city ? ` in ${business.city}` : ""}.`,
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: absoluteUrl(postPublicPath(business.slug, p.slug)),
      datePublished: p.published_at ?? undefined,
    })),
  };
}
