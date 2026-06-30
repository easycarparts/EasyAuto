import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getOverviewBundle, type AnalyticsFilters, type Granularity, type Breakdown } from "@/lib/analytics-data";
import { decodeEntities } from "@/lib/format";
import { AnalyticsControls } from "@/components/analytics/controls";
import { OverviewChart } from "@/components/analytics/overview-chart";

export const dynamic = "force-dynamic";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Parse the URL search params into a concrete filter window (defaults: last 30d).
function parseFilters(sp: Record<string, string | string[] | undefined>): AnalyticsFilters & { fromDate: string; toDate: string } {
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const toDate = str("to") || isoDate(new Date());
  const fromDate = str("from") || isoDate(new Date(Date.now() - 30 * 86400000));
  const g = str("g");
  const granularity: Granularity = g === "week" || g === "month" ? g : "day";
  return {
    fromDate,
    toDate,
    from: new Date(`${fromDate}T00:00:00`).toISOString(),
    to: new Date(`${toDate}T23:59:59`).toISOString(),
    granularity,
    device: str("device") ?? null,
    country: str("country") ?? null,
    source: str("source") ?? null,
    path: str("path") ?? null,
    business: str("business") ?? null,
  };
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requireAdmin();
  const sp = await searchParams;
  const f = parseFilters(sp);
  const a = await getOverviewBundle(f);

  const sessionsHref = `/admin/analytics/sessions?${new URLSearchParams(
    Object.entries({
      from: f.fromDate,
      to: f.toDate,
      device: f.device ?? "",
      country: f.country ?? "",
      source: f.source ?? "",
      path: f.path ?? "",
      business: f.business ?? "",
    }).filter(([, v]) => v) as [string, string][],
  ).toString()}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            Cookieless first-party traffic.{" "}
            <Link href="/admin" className="font-semibold text-brand-600 hover:text-brand-700">
              ← Admin
            </Link>
          </p>
        </div>
        <Link
          href={sessionsHref}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-body hover:border-brand-300 hover:text-brand-700"
        >
          Explore sessions →
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-surface p-4">
        <AnalyticsControls
          from={f.fromDate}
          to={f.toDate}
          granularity={f.granularity}
          options={a.options}
          filters={{ device: f.device, country: f.country, source: f.source, path: f.path, business: f.business }}
        />
      </div>

      {/* KPI cards with period-over-period comparison ---------------------- */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Unique visitors" value={fmt(a.current.visitors)} cur={a.current.visitors} prev={a.previous.visitors} />
        <Kpi label="New visitors" value={fmt(a.current.new_visitors)} cur={a.current.new_visitors} prev={a.previous.new_visitors} />
        <Kpi label="Sessions" value={fmt(a.current.sessions)} cur={a.current.sessions} prev={a.previous.sessions} />
        <Kpi label="Page views" value={fmt(a.current.pageviews)} cur={a.current.pageviews} prev={a.previous.pageviews} />
        <Kpi label="Avg. session" value={duration(a.current.avg_session_sec)} cur={a.current.avg_session_sec} prev={a.previous.avg_session_sec} />
        <Kpi label="Pages / session" value={a.current.avg_pages.toFixed(2)} cur={a.current.avg_pages} prev={a.previous.avg_pages} />
        <Kpi label="Bounce rate" value={`${a.current.bounce_rate}%`} cur={a.current.bounce_rate} prev={a.previous.bounce_rate} invert />
        <Kpi label="Leads" value={fmt(a.current.leads_total)} cur={a.current.leads_total} prev={a.previous.leads_total} hint={`${a.current.conversion_rate}% conv.`} />
      </section>

      {/* Trend chart ------------------------------------------------------ */}
      <Card title="Trend" className="mt-6">
        {a.timeseries.length === 0 ? <Empty>No traffic in this period yet.</Empty> : <OverviewChart data={a.timeseries} />}
      </Card>

      {/* Funnel ----------------------------------------------------------- */}
      <Card title="Conversion funnel" className="mt-6">
        <Funnel a={a.funnel} />
        <p className="mt-3 text-xs text-faint">Funnel reflects the date range (segment filters above don’t apply to it).</p>
      </Card>

      {/* Auth & signups --------------------------------------------------- */}
      <Card title="Auth & signups" className="mt-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Mini label="Sign-ups" value={a.events.signup_completed ?? 0} />
          <Mini label="Logins" value={a.events.login_completed ?? 0} />
          <Mini
            label="Visit→signup"
            value={`${a.current.visitors > 0 ? (((a.events.signup_completed ?? 0) / a.current.visitors) * 100).toFixed(1) : "0"}%`}
          />
          <Mini label="Sign-in link emails" value={a.events.email_magic_link ?? 0} />
          <Mini label="Confirmation emails" value={a.events.email_confirmation ?? 0} />
          <Mini label="Reset emails" value={a.events.email_recovery ?? 0} />
        </div>
        {(a.events.signup_failed || a.events.login_failed) && (
          <p className="mt-3 text-xs text-faint">
            Failed attempts — sign-up: {a.events.signup_failed ?? 0}, sign-in: {a.events.login_failed ?? 0}.
          </p>
        )}
        <p className="mt-3 text-xs text-faint">
          Emails are logged when triggered (Resend SMTP). Auth events aren’t affected by the segment filters.
        </p>
      </Card>

      {/* Top pages — full width so long paths are readable */}
      <Card title="Top pages" className="mt-6">
        <RankTable
          head={["Page", "Views", "Avg time", "Scroll", "Exits"]}
          rows={a.topPages.map((p) => [p.path, fmt(p.views), duration(p.avg_sec), `${p.avg_scroll}%`, fmt(p.exits)])}
          empty="No page views yet."
        />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Most-viewed listings">
          <RankTable
            head={["Business", "Views", "Avg time"]}
            rows={a.topBusinesses.map((b) => [b.name ? decodeEntities(b.name) : b.business_slug, fmt(b.views), duration(b.avg_sec)])}
            empty="No listing views yet."
          />
        </Card>
        <Card title="CTA clicks">
          <BarList items={toItems(a.cta)} />
          <p className="mt-3 text-xs text-faint">
            WhatsApp / call / directions clicks on listings (date range; segment filters don’t apply).
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Traffic sources">
          <BarList items={a.sources.map((s) => ({ label: s.referrer_host, value: s.sessions }))} />
        </Card>
        <Card title="New vs returning">
          <BarList items={toItems(a.returning)} />
        </Card>
        <Card title="Devices">
          <BarList items={toItems(a.devices)} />
        </Card>
        <Card title="Countries">
          <BarList items={toItems(a.countries)} />
        </Card>
      </div>

      <p className="mt-8 text-xs text-faint">
        Anonymous first-party analytics. Unique visitors use a persistent random id (no personal data); admin traffic is
        excluded. Geo needs the production edge — “Unknown” in local dev.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- helpers */

function toItems(rows: Breakdown[]) {
  return rows.map((r) => ({ label: r.label, value: r.sessions }));
}
function fmt(n: number): string {
  return n.toLocaleString("en-GB");
}
function duration(sec: number): string {
  if (!sec || sec < 1) return "0s";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
/* ---------------------------------------------------------------- components */

function Kpi({
  label,
  value,
  cur,
  prev,
  hint,
  invert,
}: {
  label: string;
  value: string;
  cur: number;
  prev: number;
  hint?: string;
  invert?: boolean; // for metrics where down is good (bounce rate)
}) {
  const delta = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0;
  const good = invert ? delta < 0 : delta > 0;
  const neutral = delta === 0 || prev === 0;
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-ink">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {neutral ? (
          <span className="text-faint">—</span>
        ) : (
          <span className={good ? "font-semibold text-success-600" : "font-semibold text-danger-600"}>
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
        {hint ? <span className="text-faint">{hint}</span> : <span className="text-faint">vs prev.</span>}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-line bg-canvas p-3">
      <p className="text-xs font-medium text-faint">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold text-ink">{typeof value === "number" ? fmt(value) : value}</p>
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-5 ${className}`}>
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted">{children}</p>;
}

function Funnel({ a }: { a: { listing_views: number; cta_clicks: number; form_submits: number; won: number } }) {
  const steps = [
    { label: "Listing views", value: a.listing_views },
    { label: "CTA clicks (WhatsApp / call / directions)", value: a.cta_clicks },
    { label: "Form submissions", value: a.form_submits },
    { label: "Won", value: a.won },
  ];
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : null;
        const conv = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-body">{s.label}</span>
              <span className="font-semibold text-ink">
                {fmt(s.value)}
                {conv !== null && <span className="ml-2 text-xs font-normal text-faint">{conv}%</span>}
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${(s.value / max) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BarList({ items }: { items: { label: string; value: number }[] }) {
  if (items.length === 0) return <Empty>No data yet.</Empty>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-1.5">
      {items.map((it) => (
        <div key={it.label} className="relative flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
          <div className="absolute inset-y-0 left-0 rounded-md bg-brand-50" style={{ width: `${(it.value / max) * 100}%` }} aria-hidden />
          <span className="relative z-10 truncate text-body">{it.label}</span>
          <span className="relative z-10 ml-2 font-semibold text-ink">{fmt(it.value)}</span>
        </div>
      ))}
    </div>
  );
}

function RankTable({ head, rows, empty }: { head: string[]; rows: (string | number)[][]; empty: string }) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-faint">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={`py-2 font-semibold ${i === 0 ? "" : "text-right"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-line/60 last:border-0">
              {r.map((cell, ci) =>
                ci === 0 ? (
                  // First column takes the remaining width and truncates with a
                  // hover tooltip showing the full value (long paths/names).
                  <td key={ci} className="w-full max-w-0 py-2 pr-3 text-body">
                    <span className="block truncate" title={String(cell)}>
                      {cell}
                    </span>
                  </td>
                ) : (
                  <td key={ci} className="whitespace-nowrap py-2 pl-3 text-right font-medium text-ink">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
