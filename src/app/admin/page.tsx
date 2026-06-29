import Link from "next/link";
import { getPendingSubmissions, getPendingClaims, getRecentLeads, getPendingGoogleReviewRefreshes } from "@/lib/admin-data";
import {
  approveSubmission,
  rejectSubmission,
  approveClaim,
  rejectClaim,
  approveGoogleReviewRefresh,
  rejectGoogleReviewRefresh,
} from "./actions";
import { decodeEntities } from "@/lib/format";

export default async function AdminPage() {
  const [submissions, claims, reviewRefreshes, leads] = await Promise.all([
    getPendingSubmissions(),
    getPendingClaims(),
    getPendingGoogleReviewRefreshes(),
    getRecentLeads(50),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Admin</h1>
      <p className="mt-1 text-sm text-muted">
        Review submissions and claims, and monitor leads.
      </p>

      {/* Pending submissions ------------------------------------------------ */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-ink">
          Pending submissions{" "}
          <span className="text-sm font-normal text-muted">({submissions.length})</span>
        </h2>
        {submissions.length === 0 ? (
          <Empty>No submissions awaiting review.</Empty>
        ) : (
          <ul className="mt-4 space-y-3">
            {submissions.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-line bg-surface p-4"
              >
                <div className="min-w-0">
                  <p className="font-bold text-ink">{decodeEntities(b.name)}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {[b.category_slug, b.city, b.phone].filter(Boolean).join(" · ")}
                  </p>
                  {b.description && (
                    <p className="mt-1 line-clamp-2 max-w-prose text-sm text-body">
                      {b.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={approveSubmission}>
                    <input type="hidden" name="businessId" value={b.id} />
                    <ApproveButton>Approve &amp; publish</ApproveButton>
                  </form>
                  <form action={rejectSubmission}>
                    <input type="hidden" name="businessId" value={b.id} />
                    <RejectButton>Reject</RejectButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending claims ----------------------------------------------------- */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-ink">
          Pending claims <span className="text-sm font-normal text-muted">({claims.length})</span>
        </h2>
        {claims.length === 0 ? (
          <Empty>No claims awaiting review.</Empty>
        ) : (
          <ul className="mt-4 space-y-3">
            {claims.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-line bg-surface p-4"
              >
                <div className="min-w-0">
                  <p className="font-bold text-ink">
                    {c.business ? decodeEntities(c.business.name) : `Business #${c.business_id}`}
                    {c.business && (
                      <Link
                        href={`/business/${c.business.slug}`}
                        className="ml-2 text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        view
                      </Link>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Claimant: {c.profile?.email ?? c.contact_email ?? c.user_id}
                    {c.contact_phone ? ` · ${c.contact_phone}` : ""}
                  </p>
                  {c.message && (
                    <p className="mt-1 max-w-prose text-sm text-body">“{c.message}”</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={approveClaim}>
                    <input type="hidden" name="claimId" value={c.id} />
                    <ApproveButton>Approve claim</ApproveButton>
                  </form>
                  <form action={rejectClaim}>
                    <input type="hidden" name="claimId" value={c.id} />
                    <RejectButton>Reject</RejectButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Google review refresh requests (paid API — admin approves each) -------- */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-ink">
          Google review refresh requests{" "}
          <span className="text-sm font-normal text-muted">({reviewRefreshes.length})</span>
        </h2>
        <p className="mt-1 text-sm text-muted">
          Each approval calls the Google Places API (paid). Only approve for claimed listings.
        </p>
        {reviewRefreshes.length === 0 ? (
          <Empty>No review refresh requests awaiting approval.</Empty>
        ) : (
          <ul className="mt-4 space-y-3">
            {reviewRefreshes.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-line bg-surface p-4"
              >
                <div className="min-w-0">
                  <p className="font-bold text-ink">
                    {r.business ? decodeEntities(r.business.name) : `Business #${r.business_id}`}
                    {r.business && (
                      <Link
                        href={`/business/${r.business.slug}`}
                        className="ml-2 text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        view
                      </Link>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Requested by {r.profile?.email ?? "owner"} ·{" "}
                    {new Date(r.created_at).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  {r.business && (
                    <p className="mt-1 text-sm text-body">
                      Current:{" "}
                      {r.business.rating != null ? `${r.business.rating}★` : "no rating"}
                      {r.business.google_reviews != null
                        ? ` · ${r.business.google_reviews} reviews`
                        : ""}
                      {!r.business.claimed && (
                        <span className="ml-2 text-danger-600">(not claimed — reject)</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={approveGoogleReviewRefresh}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <ApproveButton>Approve &amp; refresh</ApproveButton>
                  </form>
                  <form action={rejectGoogleReviewRefresh}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <RejectButton>Reject</RejectButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent leads ------------------------------------------------------- */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-ink">Recent leads</h2>
        {leads.length === 0 ? (
          <Empty>No leads captured yet.</Empty>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-faint">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">When</th>
                  <th className="px-4 py-2.5 font-semibold">Action</th>
                  <th className="px-4 py-2.5 font-semibold">Business</th>
                  <th className="px-4 py-2.5 font-semibold">Category</th>
                  <th className="px-4 py-2.5 font-semibold">City</th>
                  <th className="px-4 py-2.5 font-semibold">Routed</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-2.5 text-muted">
                      {new Date(l.created_at).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-body">{l.action ?? "—"}</td>
                    <td className="px-4 py-2.5 text-body">
                      {l.business ? (
                        <Link
                          href={`/business/${l.business.slug}`}
                          className="font-medium text-brand-600 hover:text-brand-700"
                        >
                          {decodeEntities(l.business.name)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-body">{l.category_slug ?? "—"}</td>
                    <td className="px-4 py-2.5 text-body">{l.city ?? "—"}</td>
                    <td className="px-4 py-2.5 text-body">{l.routed_to ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-xl border border-dashed border-line-strong bg-surface p-6 text-center text-sm text-muted">
      {children}
    </p>
  );
}

function ApproveButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700"
    >
      {children}
    </button>
  );
}

function RejectButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-danger-600 transition hover:bg-danger-50"
    >
      {children}
    </button>
  );
}
