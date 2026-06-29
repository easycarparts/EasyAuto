import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedBusiness, getMediaForOwner, getCategorySlugs, getPendingGoogleReviewRefresh, getGoogleReviewsForOwner } from "@/lib/owner-data";
import { getAllCategories } from "@/lib/data";
import { BusinessForm } from "@/components/dashboard/business-form";
import { FeaturedReviewsPicker } from "@/components/dashboard/featured-reviews-picker";
import { GoogleReviewsRefresh } from "@/components/dashboard/google-reviews-refresh";
import { LeadAdsToggle } from "@/components/dashboard/lead-ads-toggle";
import { MediaManager } from "@/components/dashboard/media-manager";
import { ScorePanel } from "@/components/score-badge";
import { resolvePlaceId } from "@/lib/google-review-refresh";
import { decodeEntities } from "@/lib/format";

export default async function EditBusinessPage({
  params,
}: PageProps<"/dashboard/business/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const businessId = Number(id);
  if (!businessId) notFound();

  const business = await getOwnedBusiness(user.id, businessId);
  if (!business) notFound();

  const [cats, media, selected, pendingReviewRequest, googleReviews] = await Promise.all([
    getAllCategories(),
    getMediaForOwner(businessId),
    getCategorySlugs(businessId),
    getPendingGoogleReviewRefresh(businessId),
    getGoogleReviewsForOwner(businessId),
  ]);
  const categories = cats.map((c) => ({ slug: c.slug, name: decodeEntities(c.name) }));
  const hasGooglePlaceRef = Boolean(resolvePlaceId(business));

  let canRequest = business.claimed && hasGooglePlaceRef && !pendingReviewRequest;
  let requestHint: string | undefined;
  if (!business.claimed) {
    canRequest = false;
    requestHint = "Claim this listing before requesting a review refresh.";
  } else if (!hasGooglePlaceRef) {
    canRequest = false;
    requestHint = "Save a Google Maps link above first.";
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">Edit listing</h1>
      <p className="mt-2 text-sm text-muted">
        Keep your profile complete and current — it directly improves your Easy Auto Score and how
        you rank in the directory.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="order-2 lg:order-1">
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
            <BusinessForm
              mode="edit"
              businessId={businessId}
              categories={categories}
              selected={selected}
              primaryCategory={business.category_slug ?? ""}
              initial={{
                name: decodeEntities(business.name),
                description: business.description ?? "",
                address: business.address ?? "",
                city: business.city ?? "",
                phone: business.phone ?? "",
                email: business.email ?? "",
                website: business.website ?? "",
                socialLinks: business.social_links ?? {},
                hours: business.hours ?? "",
                googleMapsLink:
                  business.google_link ??
                  (business.latitude != null && business.longitude != null
                    ? `https://www.google.com/maps?q=${business.latitude},${business.longitude}`
                    : ""),
                hasMapPin: business.latitude != null && business.longitude != null,
              }}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-card">
            <h2 className="text-base font-bold text-ink">Photos &amp; videos</h2>
            <p className="mt-1 text-sm text-muted">
              Upload photos and videos, then pick which photo is the main hero image on your
              public listing page.
            </p>
            <div className="mt-4">
              <MediaManager
                businessId={businessId}
                media={media}
                coverUrl={business.thumbnail_url}
                originalCoverUrl={business.original_thumbnail_url}
              />
            </div>
          </div>

          <FeaturedReviewsPicker businessId={businessId} reviews={googleReviews} />
        </div>

        <aside className="order-1 space-y-4 lg:order-2">
          <ScorePanel score={business.easy_auto_score} breakdown={business.score_breakdown} />
          <GoogleReviewsRefresh
            businessId={businessId}
            rating={business.rating}
            reviewCount={business.google_reviews}
            claimed={business.claimed}
            hasGooglePlaceRef={hasGooglePlaceRef}
            pendingRequest={pendingReviewRequest}
            canRequest={canRequest}
            requestHint={requestHint}
          />
          <LeadAdsToggle
            businessId={businessId}
            claimed={business.claimed}
            enabled={business.lead_ads_enabled !== false}
          />
          <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted shadow-card">
            <p className="font-semibold text-ink">Status</p>
            <p className="mt-1 capitalize">{business.status === "publish" ? "Live" : business.status}</p>
            {business.status === "publish" && (
              <Link
                href={`/business/${business.slug}`}
                className="mt-3 inline-block font-semibold text-brand-600 hover:text-brand-700"
              >
                View public page →
              </Link>
            )}
            <Link
              href={`/dashboard/business/${businessId}/blog`}
              className="mt-3 block font-semibold text-brand-600 hover:text-brand-700"
            >
              Manage blog articles →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
