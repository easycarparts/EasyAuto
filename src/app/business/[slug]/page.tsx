import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RatingStars } from "@/components/rating-stars";
import { ScorePanel } from "@/components/score-badge";
import { LeadButtons } from "@/components/lead-buttons";
import { SocialLinkIcons } from "@/components/social-links";
import { GoogleReviewCarousel } from "@/components/google-review-carousel";
import { JsonLd } from "@/components/json-ld";
import {
  getAllBusinessSlugs,
  getBusinessBySlug,
  getBusinessMedia,
  getCategoryBySlug,
  getCategoriesBySlugs,
  getCategorySlugsForBusiness,
  getFeaturedGoogleReviews,
  getSimilarBusinesses,
} from "@/lib/data";
import { blogIndexPath, getPublishedPostsForBusiness, postPublicPath } from "@/lib/post-data";
import { googleMapsDirectionsUrl, resolveCoordinates } from "@/lib/navigation-links";
import { hasSocialLinks } from "@/lib/social-links";
import { SimilarBusinesses } from "@/components/similar-businesses";

// ISR: owner edits, new photos/videos and claim approvals appear without a full
// rebuild. generateStaticParams still prerenders every listing at build time.
export const revalidate = 3600;
import { decodeEntities, formatCount, parseHours } from "@/lib/format";
import { SITE, absoluteUrl } from "@/lib/site";
import { breadcrumbJsonLd, localBusinessJsonLd } from "@/lib/structured-data";

export async function generateStaticParams() {
  const slugs = await getAllBusinessSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/business/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) return { title: "Business not found" };

  const category = business.category_slug
    ? await getCategoryBySlug(business.category_slug)
    : null;
  const name = decodeEntities(business.name);
  const catName = category ? decodeEntities(category.name) : "Auto services";
  const area = business.city ?? "the UAE";

  // Keyword + location in the title (was just "<name> in <city>"); category is the
  // commercial query users actually search ("car detailing in Al Quoz").
  const title = `${name} — ${catName} in ${area}`;
  const ratingBit =
    business.rating != null
      ? `★ ${business.rating}${business.google_reviews ? ` · ${formatCount(business.google_reviews)} reviews` : ""}. `
      : "";
  const description =
    `${ratingBit}${name} — ${catName.toLowerCase()} in ${area}. ` +
    `${business.address ? `${business.address}. ` : ""}` +
    `See photos, opening hours, phone, reviews & directions on ${SITE.name}.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/business/${slug}`) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/business/${slug}`),
      images: business.thumbnail_url ? [{ url: business.thumbnail_url }] : undefined,
    },
  };
}

export default async function BusinessPage({
  params,
}: PageProps<"/business/[slug]">) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();

  const category = business.category_slug
    ? await getCategoryBySlug(business.category_slug)
    : null;
  const categoryName = category ? decodeEntities(category.name) : null;

  const media = await getBusinessMedia(business.id);
  const blogPosts = await getPublishedPostsForBusiness(business.id);
  const featuredReviews = await getFeaturedGoogleReviews(business.id);
  const [categorySlugs, similarBusinesses] = await Promise.all([
    getCategorySlugsForBusiness(business.id),
    getSimilarBusinesses(
      business.id,
      business.category_slug,
      business.latitude,
      business.longitude,
      business.city,
      6,
    ),
  ]);
  const linkedCategories = await getCategoriesBySlugs(
    categorySlugs.length > 0 ? categorySlugs : business.category_slug ? [business.category_slug] : [],
  );

  const coords = resolveCoordinates(business.latitude, business.longitude);
  const hasGeo = coords != null;
  const mapsLink = coords
    ? googleMapsDirectionsUrl(coords.latitude, coords.longitude, business.google_link)
    : business.google_link;

  return (
    <>
      <JsonLd data={localBusinessJsonLd(business, category?.name, featuredReviews)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: SITE.url },
          ...(category
            ? [{ name: categoryName!, url: absoluteUrl(`/business-category/${category.slug}`) }]
            : []),
          { name: business.name, url: absoluteUrl(`/business/${slug}`) },
        ])}
      />

      <Container className="py-8">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            ...(category
              ? [{ label: categoryName!, href: `/business-category/${category.slug}` }]
              : []),
            { label: business.name },
          ]}
        />
      </Container>

      <Container className="grid gap-8 pb-16 lg:grid-cols-[1fr_22rem]">
        {/* Main column */}
        <div className="min-w-0">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-line bg-canvas">
            {business.thumbnail_url ? (
              <Image
                src={business.thumbnail_url}
                alt={business.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 700px"
                className="object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-50 to-brand-100 text-brand-300">
                <span className="text-5xl font-bold">EA</span>
              </div>
            )}
          </div>

          <div className="mt-6">
            {linkedCategories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {linkedCategories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/business-category/${c.slug}`}
                    className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                      c.slug === business.category_slug
                        ? "bg-brand-600 text-white"
                        : "border border-line bg-canvas text-brand-600 hover:border-brand-300 hover:bg-brand-50"
                    }`}
                  >
                    {decodeEntities(c.name)}
                  </Link>
                ))}
              </div>
            ) : (
              categoryName &&
              category && (
                <Link
                  href={`/business-category/${category.slug}`}
                  className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  {categoryName}
                </Link>
              )
            )}
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              {business.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <RatingStars rating={business.rating} reviews={business.google_reviews} />
              {business.city && (
                <span className="text-sm text-muted">📍 {business.city}</span>
              )}
              {business.claimed && (
                <span className="rounded-full bg-success-500/10 px-2.5 py-0.5 text-xs font-semibold text-success-600">
                  Verified
                </span>
              )}
              {business.updated_at && (
                <span className="text-xs text-faint">
                  Updated{" "}
                  {new Date(business.updated_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>

          {business.description && (
            <section className="mt-8">
              <h2 className="text-xl font-bold text-ink">About</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-body">
                {business.description}
              </p>
            </section>
          )}

          {featuredReviews.length > 0 && (
            <GoogleReviewCarousel reviews={featuredReviews} mapsLink={mapsLink} />
          )}

          {/* Unique, crawlable content from real Google reviews. Strengthens
              rich-result eligibility for the AggregateRating stars and gives each
              listing distinct on-page text (kills the "thin directory page" signal). */}
          {(() => {
            const keywords = business.review_keywords
              ?.split(",")
              .map((k) => k.trim())
              .filter(Boolean)
              .slice(0, 12);
            if (!keywords?.length) return null;
            return (
              <section className="mt-8">
                <h2 className="text-xl font-bold text-ink">
                  What customers mention
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Themes from {business.name}&apos;s Google reviews
                  {business.google_reviews
                    ? ` (${formatCount(business.google_reviews)} reviews)`
                    : ""}
                  :
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {keywords.map((k) => (
                    <span
                      key={k}
                      className="rounded-full border border-line bg-canvas px-3 py-1 text-sm capitalize text-body"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </section>
            );
          })()}

          {blogPosts.length > 0 && (
            <section className="mt-8">
              <div className="flex items-end justify-between gap-4">
                <h2 className="text-xl font-bold text-ink">Guides &amp; articles</h2>
                <Link
                  href={blogIndexPath(slug)}
                  className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  View all →
                </Link>
              </div>
              <ul className="mt-4 space-y-3">
                {blogPosts.slice(0, 3).map((post) => (
                  <li key={post.id}>
                    <Link
                      href={postPublicPath(slug, post.slug)}
                      className="block rounded-xl border border-line bg-surface px-4 py-3 shadow-card transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <span className="font-semibold text-ink">{post.title}</span>
                      {post.excerpt && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{post.excerpt}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {media.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-bold text-ink">Gallery</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {media.map((m) =>
                  m.kind === "video" ? (
                    <video
                      key={m.id}
                      src={m.url}
                      poster={m.thumbnail_url ?? undefined}
                      controls
                      className="aspect-square w-full rounded-xl border border-line object-cover"
                    />
                  ) : (
                    <div
                      key={m.id}
                      className="relative aspect-square overflow-hidden rounded-xl border border-line bg-canvas"
                    >
                      <Image
                        src={m.url}
                        alt={`${business.name}${categoryName ? ` — ${categoryName}` : ""} photo`}
                        fill
                        sizes="(max-width: 640px) 50vw, 220px"
                        className="object-cover"
                      />
                    </div>
                  ),
                )}
              </div>
            </section>
          )}

          {hasGeo && (
            <section className="mt-8">
              <h2 className="text-xl font-bold text-ink">Location</h2>
              <div className="mt-3 overflow-hidden rounded-2xl border border-line">
                <iframe
                  title={`Map showing ${business.name}`}
                  className="h-72 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${business.latitude},${business.longitude}&z=15&output=embed`}
                />
              </div>
              {business.address && (
                <p className="mt-3 text-sm text-muted">{business.address}</p>
              )}
            </section>
          )}

          <SimilarBusinesses
            businesses={similarBusinesses}
            categoryName={categoryName}
            city={business.city}
          />
        </div>

        {/* Sidebar — contact / actions. Real lead capture lands here in Step 6. */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <ScorePanel score={business.easy_auto_score} breakdown={business.score_breakdown} />
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
            <h2 className="text-base font-bold text-ink">Contact</h2>
            <div className="mt-4 space-y-2.5">
              {business.phone && (
                <ContactRow label="Phone" value={business.phone} href={`tel:${business.phone}`} />
              )}
              {business.website && (
                <ContactRow
                  label="Website"
                  value={prettyUrl(business.website)}
                  href={business.website}
                  external
                />
              )}
              {business.address && (
                <ContactRow label="Address" value={business.address} />
              )}
              {(() => {
                const hours = parseHours(business.hours);
                if (!hours) return null;
                if (hours.length === 1) return <ContactRow label="Hours" value={hours[0]} />;
                return (
                  <div className="text-sm">
                    <span className="block text-xs font-medium uppercase tracking-wide text-faint">
                      Hours
                    </span>
                    <ul className="mt-0.5 space-y-0.5 text-body">
                      {hours.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>

            {hasSocialLinks(business.social_links) && (
              <div className="mt-5 border-t border-line pt-5">
                <span className="block text-xs font-medium uppercase tracking-wide text-faint">
                  Social
                </span>
                <SocialLinkIcons links={business.social_links} className="mt-2.5 flex flex-wrap gap-2" />
              </div>
            )}

            <div className="mt-6">
              <LeadButtons
                business={{
                  id: business.id,
                  name: business.name,
                  phone: business.phone,
                  categorySlug: business.category_slug,
                  city: business.city,
                }}
                mapsLink={mapsLink}
                latitude={business.latitude}
                longitude={business.longitude}
              />
            </div>
          </div>

          {!business.claimed && (
            <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-5 text-center">
              <p className="text-sm font-semibold text-ink">Is this your business?</p>
              <p className="mt-1 text-xs text-muted">
                Claim your free listing to edit details, add photos &amp; videos, and get a Verified
                badge.
              </p>
              <Link
                href={`/dashboard/claim/${slug}`}
                className="mt-3 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Claim this business
              </Link>
            </div>
          )}
        </aside>
      </Container>
    </>
  );
}

function ContactRow({
  label,
  value,
  href,
  external,
}: {
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  return (
    <div className="text-sm">
      <span className="block text-xs font-medium uppercase tracking-wide text-faint">
        {label}
      </span>
      {href ? (
        <a
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="break-words font-medium text-brand-600 hover:text-brand-700"
        >
          {value}
        </a>
      ) : (
        <span className="break-words text-body">{value}</span>
      )}
    </div>
  );
}

function prettyUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
