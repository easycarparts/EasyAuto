"use client";

// Date range + granularity + segment filters for the analytics overview. Every
// change is written to the URL search params; the server page re-reads them and
// refetches. Keeps the dashboard shareable/bookmarkable and the data server-side.

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { FilterOptions, Granularity } from "@/lib/analytics-data";

const PRESETS = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 365, label: "12m" },
] as const;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function AnalyticsControls({
  from,
  to,
  granularity,
  options,
  filters,
  basePath = "/admin/analytics",
  showGranularity = true,
}: {
  from: string; // yyyy-mm-dd
  to: string;
  granularity: Granularity;
  options: FilterOptions;
  filters: { device?: string | null; country?: string | null; source?: string | null; path?: string | null; business?: string | null };
  basePath?: string;
  showGranularity?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      next.delete("offset"); // any change resets pagination
      router.push(`${pathname.startsWith(basePath) ? pathname : basePath}?${next.toString()}`);
    },
    [params, pathname, router, basePath],
  );

  const setPreset = (days: number) => {
    const t = new Date();
    const f = new Date(t.getTime() - days * 86400000);
    update({ from: isoDate(f), to: isoDate(t) });
  };

  const activePreset = (() => {
    const t = new Date(to).getTime();
    const f = new Date(from).getTime();
    const days = Math.round((t - f) / 86400000);
    const today = isoDate(new Date());
    if (to !== today) return null;
    return PRESETS.find((p) => Math.abs(p.days - days) <= 1)?.days ?? null;
  })();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Presets */}
        <div className="flex overflow-hidden rounded-lg border border-line">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setPreset(p.days)}
              className={`px-3 py-1.5 text-xs font-semibold ${
                activePreset === p.days ? "bg-brand-600 text-white" : "bg-surface text-body hover:bg-canvas"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom range */}
        <label className="flex items-center gap-1.5 text-xs text-muted">
          From
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => update({ from: e.target.value })}
            className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-body"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          To
          <input
            type="date"
            value={to}
            min={from}
            max={isoDate(new Date())}
            onChange={(e) => update({ to: e.target.value })}
            className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-body"
          />
        </label>

        {/* Granularity */}
        {showGranularity && (
          <Select
            label="By"
            value={granularity}
            onChange={(v) => update({ g: v })}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
        )}
      </div>

      {/* Segment filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-faint">Filter</span>
        <FilterSelect label="Device" value={filters.device} options={options.devices} onChange={(v) => update({ device: v })} />
        <FilterSelect label="Country" value={filters.country} options={options.countries} onChange={(v) => update({ country: v })} />
        <FilterSelect label="Source" value={filters.source} options={options.sources} onChange={(v) => update({ source: v })} />
        <FilterSelect
          label="Business"
          value={filters.business}
          options={options.businesses.map((b) => b.slug)}
          labels={Object.fromEntries(options.businesses.map((b) => [b.slug, b.name]))}
          onChange={(v) => update({ business: v })}
        />
        <input
          type="text"
          defaultValue={filters.path ?? ""}
          placeholder="Page path contains…"
          onKeyDown={(e) => {
            if (e.key === "Enter") update({ path: (e.target as HTMLInputElement).value || null });
          }}
          onBlur={(e) => {
            if ((e.target.value || null) !== (filters.path ?? null)) update({ path: e.target.value || null });
          }}
          className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-body"
        />
        {(filters.device || filters.country || filters.source || filters.business || filters.path) && (
          <button
            type="button"
            onClick={() => update({ device: null, country: null, source: null, business: null, path: null })}
            className="rounded-lg border border-line bg-surface px-2 py-1 text-xs font-semibold text-danger-600 hover:bg-danger-50"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-body"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterSelect({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value?: string | null;
  options: string[];
  labels?: Record<string, string>;
  onChange: (v: string | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={`rounded-lg border px-2 py-1 text-xs ${
        value ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line bg-surface text-body"
      }`}
    >
      <option value="">{label}: all</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {labels?.[o] ?? o}
        </option>
      ))}
    </select>
  );
}
