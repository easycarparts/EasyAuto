import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CrossLinkCallout } from "@/components/cross-link-callout";
import { BusinessForm } from "@/components/dashboard/business-form";
import { getCurrentUser } from "@/lib/auth";
import { getAllCategories } from "@/lib/data";
import { decodeEntities } from "@/lib/format";
import { SITE, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Submit your business",
  description: `Add your auto-services business to ${SITE.name}. Reach customers searching for car wash, detailing, repair, parts and more across the UAE.`,
  alternates: { canonical: absoluteUrl("/submit-business") },
  openGraph: {
    title: "Submit your business",
    description: `List your auto-services business on ${SITE.name} — free to submit, reviewed before publishing.`,
    url: absoluteUrl("/submit-business"),
  },
};

export default async function SubmitBusinessPage() {
  const [user, cats] = await Promise.all([getCurrentUser(), getAllCategories()]);
  const categories = cats.map((c) => ({ slug: c.slug, name: decodeEntities(c.name) }));

  return (
    <>
      <div className="border-b border-line bg-surface">
        <Container className="py-8">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Submit business" }]} />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Submit your business
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            Add a new auto-services business to Easy Auto and reach customers across the UAE.
            Submissions are reviewed before publishing — usually within a couple of business days.
          </p>
        </Container>
      </div>

      <Container className="py-10">
        <div className="mx-auto max-w-2xl">
          <CrossLinkCallout
            title="Already listed on Easy Auto?"
            description="If your business is already in our directory, claim it to update your profile, photos and contact details."
            href="/claim-business"
            label="Claim your listing"
          />

          {!user ? (
            <div className="mt-6 rounded-2xl border border-line bg-surface p-8 shadow-card">
              <h2 className="text-xl font-bold text-ink">Add a new business</h2>
              <p className="mt-2 text-sm text-muted">
                Sign in or create a free account to submit your listing. You&apos;ll be able to add
                photos, hours and contact details after it&apos;s created.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/login?next=/submit-business"
                  className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Sign in to submit
                </Link>
                <Link
                  href="/login?next=/submit-business"
                  className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold text-body transition hover:border-brand-300 hover:bg-brand-50"
                >
                  Create account
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-6 text-sm text-muted">
                Signed in as {user.email}. After submitting you can manage your listing from your{" "}
                <Link href="/dashboard" className="font-semibold text-brand-600 hover:text-brand-700">
                  dashboard
                </Link>
                .
              </p>
              <div className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-card">
                <BusinessForm mode="create" categories={categories} />
              </div>
            </>
          )}

          <section className="mt-10 space-y-4 text-sm text-muted">
            <h2 className="text-base font-bold text-ink">Why list on Easy Auto?</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Thousands of people search for auto services across the UAE every month</li>
              <li>Show your ratings, location, hours and contact details in one place</li>
              <li>Free to submit — no subscription required</li>
            </ul>
          </section>
        </div>
      </Container>
    </>
  );
}
