import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CrossLinkCallout } from "@/components/cross-link-callout";
import { getCurrentUser } from "@/lib/auth";
import { searchBusinesses } from "@/lib/data";
import { decodeEntities } from "@/lib/format";
import { SITE, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Claim your business",
  description: `Already listed on ${SITE.name}? Search for your business and claim it to manage your profile, photos and contact details.`,
  alternates: { canonical: absoluteUrl("/claim-business") },
  openGraph: {
    title: "Claim your business",
    description: `Find your listing on ${SITE.name} and take control of your profile.`,
    url: absoluteUrl("/claim-business"),
  },
};

export default async function ClaimBusinessPage({
  searchParams,
}: PageProps<"/claim-business">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const [user, results] = await Promise.all([
    getCurrentUser(),
    query ? searchBusinesses(query, 25) : Promise.resolve([]),
  ]);

  return (
    <>
      <div className="border-b border-line bg-surface">
        <Container className="py-8">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Claim business" }]} />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Claim your business
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            Search for your business below. If you find it, claim the listing to take control of your
            profile, photos and contact details.
          </p>
        </Container>
      </div>

      <Container className="py-10">
        <div className="mx-auto max-w-2xl">
          <CrossLinkCallout
            title="Business not listed yet?"
            description="If you can't find your business in our directory, add it as a new listing — it's free to submit."
            href="/submit-business"
            label="Add your business"
          />

          <form method="get" className="mt-6 flex gap-2">
            <input
              name="q"
              defaultValue={query}
              autoFocus
              placeholder="Search by business name…"
              className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Search
            </button>
          </form>

          {query && results.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-line-strong bg-surface p-6 text-center">
              <p className="text-sm text-muted">
                No matches for &ldquo;{query}&rdquo;. Try a different spelling or search term.
              </p>
              <p className="mt-2 text-sm font-medium text-ink">
                If your business isn&apos;t in our directory yet, you can add it for free.
              </p>
              <Link
                href="/submit-business"
                className="mt-4 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Add your business →
              </Link>
            </div>
          )}

          {results.length > 0 && (
            <ul className="mt-6 space-y-3">
              {results.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{decodeEntities(b.name)}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {[b.city, b.address].filter(Boolean).join(" · ") || "UAE"}
                    </p>
                  </div>
                  {b.claimed ? (
                    <span className="shrink-0 rounded-full bg-success-500/10 px-3 py-1 text-xs font-semibold text-success-600">
                      Already claimed
                    </span>
                  ) : user ? (
                    <Link
                      href={`/dashboard/claim/${b.slug}`}
                      className="shrink-0 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                    >
                      Claim →
                    </Link>
                  ) : (
                    <Link
                      href={`/login?next=${encodeURIComponent(`/dashboard/claim/${b.slug}`)}`}
                      className="shrink-0 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                    >
                      Sign in to claim →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </>
  );
}
