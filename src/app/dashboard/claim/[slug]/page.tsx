import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusinessBySlug } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { ClaimForm } from "@/components/dashboard/claim-form";
import { decodeEntities } from "@/lib/format";

export default async function ClaimBusinessPage({
  params,
}: PageProps<"/dashboard/claim/[slug]">) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();

  const user = await getCurrentUser();
  const alreadyClaimed = business.claimed || business.owner_id;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
        Claim {decodeEntities(business.name)}
      </h1>

      {alreadyClaimed ? (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-card">
          <p className="text-sm text-body">
            This listing has already been claimed. If you believe this is a mistake, contact us at{" "}
            <a
              href="mailto:hello@sgservices.ae"
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              hello@sgservices.ae
            </a>
            .
          </p>
          <Link
            href={`/business/${business.slug}`}
            className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            View the listing →
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            Claim this listing to manage its details, add photos and videos, and earn a{" "}
            <strong>Verified</strong> badge — which raises your Easy Auto Score. We&apos;ll review
            your claim before granting access.
          </p>
          <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-card">
            <ClaimForm slug={business.slug} defaultEmail={user?.email ?? business.email} />
          </div>
        </>
      )}
    </div>
  );
}
