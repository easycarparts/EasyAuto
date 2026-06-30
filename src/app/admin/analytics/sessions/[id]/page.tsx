import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getSessionDetail } from "@/lib/analytics-data";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({ params }: PageProps<"/admin/analytics/sessions/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const { session, pageviews, leads } = await getSessionDetail(id);
  if (!session) notFound();

  return (
    <div>
      <Link href="/admin/analytics/sessions" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
        ← All sessions
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Session</h1>
        {session.is_returning ? (
          <span className="rounded-full bg-accent-400/15 px-2.5 py-0.5 text-xs font-semibold text-accent-500">returning visitor</span>
        ) : (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">new visitor</span>
        )}
        {leads.length > 0 && (
          <span className="rounded-full bg-success-500/10 px-2.5 py-0.5 text-xs font-semibold text-success-600">★ converted</span>
        )}
      </div>

      {/* Meta grid */}
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Meta label="Started" value={new Date(session.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} />
        <Meta label="Duration" value={duration(session.duration_sec)} />
        <Meta label="Pages" value={String(session.page_count)} />
        <Meta label="Source" value={session.referrer_host || "Direct"} />
        <Meta label="Device" value={session.device_type ?? "—"} />
        <Meta label="Browser" value={session.browser ?? "—"} />
        <Meta label="OS" value={session.os ?? "—"} />
        <Meta label="Geo" value={[session.city, session.country].filter(Boolean).join(", ") || "—"} />
        {session.utm_source && <Meta label="Campaign" value={session.utm_source} />}
        <Meta label="Visitor id" value={session.visitor_id ? `${session.visitor_id.slice(0, 8)}…` : "—"} mono />
      </dl>

      {/* Journey timeline */}
      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-muted">Journey</h2>
      <ol className="mt-4 space-y-0">
        {pageviews.map((p, i) => (
          <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
            {/* rail */}
            <div className="flex flex-col items-center">
              <span className="z-10 mt-1 h-3 w-3 rounded-full border-2 border-brand-500 bg-surface" />
              {i < pageviews.length - 1 && <span className="w-px flex-1 bg-line" />}
            </div>
            <div className="flex-1 rounded-xl border border-line bg-surface p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink">
                  {p.business_slug ? (
                    <Link href={`/business/${p.business_slug}`} className="text-brand-600 hover:text-brand-700">
                      {p.title || p.path}
                    </Link>
                  ) : (
                    p.title || p.path
                  )}
                </p>
                <span className="text-xs text-faint">
                  {new Date(p.created_at).toLocaleTimeString("en-GB", { timeStyle: "short" })}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted">{p.path}</p>
              <div className="mt-2 flex gap-4 text-xs text-faint">
                <span>⏱ {p.duration_ms != null ? duration(Math.round(p.duration_ms / 1000)) : "—"}</span>
                <span>↧ {p.max_scroll_pct != null ? `${p.max_scroll_pct}% scrolled` : "—"}</span>
              </div>
            </div>
          </li>
        ))}
        {pageviews.length === 0 && <p className="text-sm text-muted">No page views recorded.</p>}
      </ol>

      {/* Conversions */}
      {leads.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-muted">Conversions in this session</h2>
          <div className="mt-4 space-y-2">
            {leads.map((l) => (
              <div key={l.id} className="rounded-xl border border-success-500/30 bg-success-500/5 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-ink">
                    {l.lead_type === "form" ? "Form enquiry" : `${l.lead_type ?? l.action ?? "click"} click`}
                    {l.name ? ` — ${l.name}` : ""}
                  </span>
                  <span className="text-xs text-faint">
                    {new Date(l.created_at).toLocaleTimeString("en-GB", { timeStyle: "short" })} · {l.status ?? "new"}
                  </span>
                </div>
                {(l.phone || l.service_slug) && (
                  <p className="mt-1 text-xs text-muted">{[l.service_slug, l.phone].filter(Boolean).join(" · ")}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-faint">{label}</dt>
      <dd className={`mt-0.5 text-sm font-semibold text-ink ${mono ? "font-mono" : "capitalize"}`}>{value}</dd>
    </div>
  );
}

function duration(sec: number): string {
  if (!sec || sec < 1) return "0s";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
