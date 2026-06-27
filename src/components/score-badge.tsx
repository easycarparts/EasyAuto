import type { ScoreBreakdown } from "@/lib/types";

type Tier = { label: string; ring: string; text: string; bg: string };

function tierFor(score: number): Tier {
  if (score >= 80) return { label: "Excellent", ring: "ring-success-500/30", text: "text-success-600", bg: "bg-success-500/10" };
  if (score >= 65) return { label: "Great", ring: "ring-brand-500/30", text: "text-brand-700", bg: "bg-brand-50" };
  if (score >= 50) return { label: "Good", ring: "ring-accent-500/30", text: "text-accent-500", bg: "bg-accent-400/10" };
  return { label: "Basic", ring: "ring-line-strong/40", text: "text-muted", bg: "bg-canvas" };
}

// Compact pill for cards/lists.
export function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const t = tierFor(score);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${t.bg} ${t.text} ${t.ring}`}
      title={`Easy Auto Score: ${score}/100 (${t.label})`}
    >
      <BoltIcon />
      {score}
    </span>
  );
}

// Fuller panel for the listing page, with the sub-score breakdown.
export function ScorePanel({
  score,
  breakdown,
}: {
  score: number | null;
  breakdown: ScoreBreakdown | null;
}) {
  if (score == null) return null;
  const t = tierFor(score);
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${t.bg} ${t.text} ring-2 ${t.ring}`}>
          <span className="text-xl font-extrabold">{score}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Easy Auto Score</p>
          <p className={`text-sm font-medium ${t.text}`}>{t.label}</p>
        </div>
      </div>
      {breakdown && (
        <dl className="mt-4 space-y-2.5">
          <Bar label="Profile completeness" value={breakdown.completeness} max={40} />
          <Bar label="Reputation" value={breakdown.reputation} max={40} />
          <Bar label="Verification" value={breakdown.trust} max={20} />
        </dl>
      )}
      <p className="mt-3 text-xs text-faint">
        Our own score from profile detail, dampened reviews and verification — not just review count.
        {breakdown?.penalised && " Review volume looked unusually high for this category and was discounted."}
      </p>
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <dt className="text-muted">{label}</dt>
        <dd className="font-semibold text-body">
          {value}/{max}
        </dd>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BoltIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13l0-8z" />
    </svg>
  );
}
