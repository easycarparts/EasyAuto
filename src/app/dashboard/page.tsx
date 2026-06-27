import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getOwnedBusinesses, getMyClaims } from "@/lib/owner-data";
import { ScoreBadge } from "@/components/score-badge";
import { DeleteListingButton } from "@/components/dashboard/delete-listing-button";
import { decodeEntities } from "@/lib/format";

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  publish: { label: "Live", cls: "bg-success-500/10 text-success-600" },
  pending: { label: "Pending review", cls: "bg-accent-400/15 text-accent-500" },
  rejected: { label: "Not approved", cls: "bg-danger-50 text-danger-600" },
};

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const user = await requireUser("/dashboard");
  const sp = await searchParams;
  const [businesses, claims] = await Promise.all([
    getOwnedBusinesses(user.id),
    getMyClaims(user.id),
  ]);

  const pendingClaims = claims.filter((c) => c.status === "pending");

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Your dashboard</h1>
          <p className="mt-1 text-sm text-muted">Manage your business listings and claims.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/claim"
            className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas"
          >
            Claim a business
          </Link>
          <Link
            href="/dashboard/submit"
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            + Submit a business
          </Link>
        </div>
      </div>

      {sp.submitted && (
        <Banner>
          Thanks! Your business was submitted and is <strong>pending review</strong>. We&apos;ll
          publish it once approved.
        </Banner>
      )}
      {sp.claim === "submitted" && (
        <Banner>
          Your claim was submitted. We&apos;ll review it and link the listing to your account once
          verified.
        </Banner>
      )}

      {/* Listings ----------------------------------------------------------- */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-ink">Your listings</h2>

        {businesses.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center">
            <p className="text-sm text-muted">You don&apos;t manage any listings yet.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                href="/dashboard/submit"
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Submit a new business
              </Link>
              <Link
                href="/dashboard/claim"
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-canvas"
              >
                Find &amp; claim an existing one
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {businesses.map((b) => {
              const status = STATUS_STYLES[b.status] ?? STATUS_STYLES.pending;
              return (
                <li
                  key={b.id}
                  className="rounded-2xl border border-line bg-surface p-5 shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-ink">{decodeEntities(b.name)}</h3>
                    <ScoreBadge score={b.easy_auto_score} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}
                    >
                      {status.label}
                    </span>
                    {b.city && <span className="text-xs text-muted">📍 {b.city}</span>}
                  </div>
                  <div className="mt-4 flex gap-3 text-sm font-semibold">
                    <Link
                      href={`/dashboard/business/${b.id}`}
                      className="text-brand-600 hover:text-brand-700"
                    >
                      Edit listing →
                    </Link>
                    {b.status === "publish" && (
                      <Link
                        href={`/business/${b.slug}`}
                        className="text-muted hover:text-ink"
                      >
                        View public page
                      </Link>
                    )}
                    {b.status === "pending" && (
                      <DeleteListingButton businessId={b.id} name={decodeEntities(b.name)} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Claim requests ----------------------------------------------------- */}
      {claims.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">Claim requests</h2>
          <ul className="mt-4 space-y-3">
            {claims.map((c) => {
              const style =
                c.status === "approved"
                  ? "bg-success-500/10 text-success-600"
                  : c.status === "rejected"
                    ? "bg-danger-50 text-danger-600"
                    : "bg-accent-400/15 text-accent-500";
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3"
                >
                  <span className="text-sm font-medium text-body">
                    {c.business ? decodeEntities(c.business.name) : "Listing"}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${style}`}>
                    {c.status}
                  </span>
                </li>
              );
            })}
          </ul>
          {pendingClaims.length > 0 && (
            <p className="mt-3 text-xs text-faint">
              Pending claims are usually reviewed within a couple of business days.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-success-500/30 bg-success-500/10 px-4 py-3 text-sm text-success-600">
      {children}
    </div>
  );
}
