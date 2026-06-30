import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getSessionsList, getFilterOptions, type AnalyticsFilters } from "@/lib/analytics-data";
import { AnalyticsControls } from "@/components/analytics/controls";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Default window (last 30 days) computed at module scope so the page render stays
// pure (the eslint react-hooks/purity rule forbids Date.now() in the component).
function defaultRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  return { toDate: isoDate(now), fromDate: isoDate(new Date(now.getTime() - 30 * 86400000)) };
}

export default async function SessionsPage({ searchParams }: PageProps<"/admin/analytics/sessions">) {
  await requireAdmin();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const dflt = defaultRange();
  const toDate = str("to") || dflt.toDate;
  const fromDate = str("from") || dflt.fromDate;
  const offset = Math.max(0, Number(str("offset") || 0)) || 0;

  const filters: AnalyticsFilters = {
    fromDate,
    toDate,
    from: new Date(`${fromDate}T00:00:00`).toISOString(),
    to: new Date(`${toDate}T23:59:59`).toISOString(),
    granularity: "day",
    device: str("device") ?? null,
    country: str("country") ?? null,
    source: str("source") ?? null,
    path: str("path") ?? null,
    business: str("business") ?? null,
  } as AnalyticsFilters & { fromDate: string; toDate: string };

  const [{ rows, total }, options] = await Promise.all([
    getSessionsList(filters, PAGE_SIZE, offset),
    getFilterOptions(filters.from, filters.to),
  ]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (o: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ from: fromDate, to: toDate, device: filters.device, country: filters.country, source: filters.source, path: filters.path, business: filters.business })) {
      if (v) next.set(k, String(v));
    }
    if (o > 0) next.set("offset", String(o));
    return `/admin/analytics/sessions?${next.toString()}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Sessions</h1>
          <p className="mt-1 text-sm text-muted">
            Individual visits — click any row to see the full journey.{" "}
            <Link href="/admin/analytics" className="font-semibold text-brand-600 hover:text-brand-700">
              ← Overview
            </Link>
          </p>
        </div>
        <span className="text-sm text-muted">{total.toLocaleString("en-GB")} sessions</span>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-surface p-4">
        <AnalyticsControls
          from={fromDate}
          to={toDate}
          granularity="day"
          options={options}
          filters={{ device: filters.device, country: filters.country, source: filters.source, path: filters.path, business: filters.business }}
          basePath="/admin/analytics/sessions"
          showGranularity={false}
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-faint">
            <tr>
              <th className="px-4 py-2.5 font-semibold">When</th>
              <th className="px-4 py-2.5 font-semibold">Entry page</th>
              <th className="px-4 py-2.5 font-semibold">Source</th>
              <th className="px-4 py-2.5 font-semibold">Device</th>
              <th className="px-4 py-2.5 font-semibold">Geo</th>
              <th className="px-4 py-2.5 text-right font-semibold">Pages</th>
              <th className="px-4 py-2.5 text-right font-semibold">Time</th>
              <th className="px-4 py-2.5 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted">
                  No sessions match these filters.
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.id} className="border-b border-line/60 last:border-0 hover:bg-canvas">
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted">
                    {new Date(s.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-2.5 text-body">{s.entry_path ?? "—"}</td>
                  <td className="px-4 py-2.5 text-body">{s.referrer_host || "Direct"}</td>
                  <td className="px-4 py-2.5 text-body capitalize">{s.device_type ?? "—"}</td>
                  <td className="px-4 py-2.5 text-body">{[s.city, s.country].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-ink">{s.page_count}</td>
                  <td className="px-4 py-2.5 text-right text-body">{duration(s.duration_sec)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {s.is_returning && (
                      <span className="mr-1 rounded-full bg-accent-400/15 px-2 py-0.5 text-xs font-semibold text-accent-500">
                        returning
                      </span>
                    )}
                    {s.lead_count > 0 && (
                      <span className="mr-1 rounded-full bg-success-500/10 px-2 py-0.5 text-xs font-semibold text-success-600">
                        ★ lead
                      </span>
                    )}
                    <Link href={`/admin/analytics/sessions/${s.id}`} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                      view →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            {offset > 0 && (
              <Link href={pageHref(offset - PAGE_SIZE)} className="rounded-lg border border-line bg-surface px-3 py-1.5 font-semibold text-body hover:border-brand-300">
                ← Prev
              </Link>
            )}
            {page < pages && (
              <Link href={pageHref(offset + PAGE_SIZE)} className="rounded-lg border border-line bg-surface px-3 py-1.5 font-semibold text-body hover:border-brand-300">
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function duration(sec: number): string {
  if (!sec || sec < 1) return "0s";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
