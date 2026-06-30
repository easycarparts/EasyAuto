"use client";

// GSC-style trend chart. A row of metric tiles (click to toggle a line on/off)
// above an interactive multi-line chart with hover tooltips. Counts share the
// left axis; average session time uses a right axis so its scale doesn't flatten
// the others.

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { TimePointV2 } from "@/lib/analytics-data";

type MetricKey = "visitors" | "new_visitors" | "sessions" | "pageviews" | "leads" | "avg_sec";

const METRICS: { key: MetricKey; label: string; color: string; axis: "left" | "right"; kind: "count" | "time" }[] = [
  { key: "visitors", label: "Visitors", color: "#2563eb", axis: "left", kind: "count" },
  { key: "new_visitors", label: "New visitors", color: "#16a34a", axis: "left", kind: "count" },
  { key: "sessions", label: "Sessions", color: "#9333ea", axis: "left", kind: "count" },
  { key: "pageviews", label: "Page views", color: "#64748b", axis: "left", kind: "count" },
  { key: "leads", label: "Leads", color: "#f59e0b", axis: "left", kind: "count" },
  { key: "avg_sec", label: "Avg. time", color: "#06b6d4", axis: "right", kind: "time" },
];

function fmtTime(sec: number): string {
  if (!sec) return "0s";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function OverviewChart({ data }: { data: TimePointV2[] }) {
  const [active, setActive] = useState<Set<MetricKey>>(new Set(["visitors", "pageviews"]));

  const toggle = (k: MetricKey) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      // Always keep at least one line visible.
      if (next.size === 0) next.add(k);
      return next;
    });

  const totals = (key: MetricKey) =>
    data.reduce((sum, d) => sum + (d[key] as number), 0);

  const showRight = active.has("avg_sec");

  return (
    <div>
      {/* Metric tiles */}
      <div className="flex flex-wrap gap-2">
        {METRICS.map((m) => {
          const on = active.has(m.key);
          const total = m.kind === "time"
            ? fmtTime(data.length ? Math.round(totals(m.key) / data.length) : 0)
            : totals(m.key).toLocaleString("en-GB");
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => toggle(m.key)}
              className={`flex min-w-[96px] flex-col items-start rounded-lg border px-3 py-2 text-left transition ${
                on ? "border-line-strong bg-canvas" : "border-line bg-surface opacity-60 hover:opacity-100"
              }`}
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: on ? m.color : "#cbd5e1" }} />
                {m.label}
                {m.kind === "time" && <span className="text-faint">(avg)</span>}
              </span>
              <span className="mt-0.5 text-lg font-bold text-ink">{total}</span>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: showRight ? 8 : 16, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#94a3b8" }} tickMargin={8} minTickGap={24} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} width={36} />
            {showRight && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "#06b6d4" }}
                width={44}
                tickFormatter={(v) => fmtTime(Number(v))}
              />
            )}
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              formatter={(value, name) => {
                const m = METRICS.find((x) => x.label === name);
                return [m?.kind === "time" ? fmtTime(Number(value)) : Number(value).toLocaleString("en-GB"), name];
              }}
            />
            {METRICS.filter((m) => active.has(m.key)).map((m) => (
              <Line
                key={m.key}
                yAxisId={m.axis}
                type="monotone"
                dataKey={m.key}
                name={m.label}
                stroke={m.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
