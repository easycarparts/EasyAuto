import Link from "next/link";
import {
  getPendingSubmissions,
  getPendingClaims,
  getRecentLeads,
  getLeadCounts,
  getPendingGoogleReviewRefreshes,
  LEAD_STATUSES,
  type LeadRow,
} from "@/lib/admin-data";
import {
  approveSubmission,
  rejectSubmission,
  approveClaim,
  rejectClaim,
  approveGoogleReviewRefresh,
  rejectGoogleReviewRefresh,
  updateLeadStatus,
} from "./actions";
import { decodeEntities } from "@/lib/format";
import { whatsappNumber } from "@/lib/format";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const statusFilter = typeof sp.status === "string" && LEAD_STATUSES.includes(sp.status as (typeof LEAD_STATUSES)[number])
    ? sp.status
    : undefined;

  const [submissions, claims, reviewRefreshes, enquiries, activity, leadCounts] = await Promise.all([
    getPendingSubmissions(),
    getPendingClaims(),
    getPendingGoogleReviewRefreshes(),
    getRecentLeads(100, { formOnly: true, status: statusFilter }),
    getRecentLeads(40),
    getLeadCounts(),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Admin</h1>
          <p className="mt-1 text-sm text-muted">
            Review submissions and claims, and monitor leads.
          </p>
        </div>
        <Link
          href="/admin/analytics"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          View analytics →
        </Link>
      </div>

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

      {/* Captured enquiries (form leads) ------------------------------------ */}
      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">
            Enquiries{" "}
            <span className="text-sm font-normal text-muted">
              ({leadCounts.form} total · {leadCounts.new} new)
            </span>
          </h2>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip label="All" href="/admin" active={!statusFilter} />
            {LEAD_STATUSES.map((s) => (
              <FilterChip
                key={s}
                label={s}
                href={`/admin?status=${s}`}
                active={statusFilter === s}
              />
            ))}
          </div>
        </div>

        {enquiries.length === 0 ? (
          <Empty>No enquiries{statusFilter ? ` with status "${statusFilter}"` : ""} yet.</Empty>
        ) : (
          <div className="mt-4 space-y-3">
            {enquiries.map((l) => (
              <LeadCard key={l.id} lead={l} />
            ))}
          </div>
        )}
      </section>

      {/* Recent click activity (whatsapp/call/directions events) ------------ */}
      <section className="mt-12">
        <h2 className="text-lg font-bold text-ink">Recent click activity</h2>
        <p className="mt-1 text-sm text-muted">
          WhatsApp / call / directions clicks on listings (not form enquiries).
        </p>
        {activity.length === 0 ? (
          <Empty>No activity yet.</Empty>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-faint">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">When</th>
                  <th className="px-4 py-2.5 font-semibold">Action</th>
                  <th className="px-4 py-2.5 font-semibold">Business</th>
                  <th className="px-4 py-2.5 font-semibold">Service</th>
                  <th className="px-4 py-2.5 font-semibold">Routed</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((l) => (
                  <tr key={l.id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-2.5 text-muted">
                      {new Date(l.created_at).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-body">{l.lead_type ?? l.action ?? "—"}</td>
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
                    <td className="px-4 py-2.5 text-body">{l.service_slug ?? l.category_slug ?? "—"}</td>
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

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full border border-brand-600 bg-brand-600 px-3 py-1 text-xs font-semibold capitalize text-white"
          : "rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold capitalize text-body hover:border-brand-300 hover:text-brand-700"
      }
    >
      {label}
    </Link>
  );
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-brand-50 text-brand-700 border-brand-200",
  contacted: "bg-accent-400/15 text-accent-500 border-accent-400/50",
  won: "bg-success-500/10 text-success-600 border-success-500/30",
  lost: "bg-canvas text-faint border-line",
};

function LeadCard({ lead: l }: { lead: LeadRow }) {
  const wa = whatsappNumber(l.phone);
  const ctx = [l.service_slug, l.location_slug].filter(Boolean).join(" · ");
  const status = l.status ?? "new";
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{l.name ?? "Unknown"}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.new}`}
            >
              {status}
            </span>
            {l.routed_to === "own_service" && (
              <span className="rounded-full border border-success-500/30 bg-success-500/10 px-2 py-0.5 text-xs font-semibold text-success-600">
                Owner lead
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            {ctx || "—"}
            {" · "}
            {new Date(l.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {l.phone && (
            <a
              href={`tel:${l.phone}`}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-body hover:border-brand-300 hover:text-brand-700"
            >
              Call
            </a>
          )}
          {wa && (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-success-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-success-600"
            >
              WhatsApp
            </a>
          )}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {l.phone && (
          <div className="flex gap-2">
            <dt className="text-faint">Phone</dt>
            <dd className="text-body">{l.phone}</dd>
          </div>
        )}
        {l.email && (
          <div className="flex gap-2">
            <dt className="text-faint">Email</dt>
            <dd className="text-body">{l.email}</dd>
          </div>
        )}
        {l.source && (
          <div className="flex gap-2 sm:col-span-2">
            <dt className="text-faint">From</dt>
            <dd className="truncate text-body">{l.source}</dd>
          </div>
        )}
      </dl>

      {l.message && (
        <p className="mt-3 rounded-lg bg-canvas p-3 text-sm text-body">{l.message}</p>
      )}

      {/* Status workflow */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-3">
        <span className="text-xs font-medium text-faint">Mark:</span>
        {LEAD_STATUSES.filter((s) => s !== status).map((s) => (
          <form key={s} action={updateLeadStatus}>
            <input type="hidden" name="leadId" value={l.id} />
            <input type="hidden" name="status" value={s} />
            <button
              type="submit"
              className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold capitalize text-body hover:border-brand-300 hover:text-brand-700"
            >
              {s}
            </button>
          </form>
        ))}
      </div>
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
