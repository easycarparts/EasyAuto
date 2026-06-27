// Live Easy Auto Score recompute (Step 1 tie-in).
//
// scripts/curate.mjs computes the full score offline (completeness + dampened
// reputation + trust) using global stats. When an OWNER edits their profile or a
// claim is approved, only the parts they influence change — completeness (richer
// profile) and trust (claimed/featured). Reputation depends on global rating
// distributions, so we preserve the last curated value rather than recomputing it
// here. Mirrors the completeness/trust formulas in curate.mjs exactly.

import type { Business, ScoreBreakdown } from "./types";

type CompletenessInput = {
  description?: string | null;
  hasImage: boolean;
  hours?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function completenessScore(b: CompletenessInput): number {
  let s = 0;
  const d = (b.description ?? "").length;
  s += d > 300 ? 12 : d > 120 ? 8 : d > 0 ? 4 : 0;
  if (b.hasImage) s += 8;
  if (b.hours) s += 6;
  if (b.website && b.website !== "#") s += 6;
  if (b.phone) s += 4;
  if (b.email) s += 2;
  if (b.latitude != null && b.longitude != null) s += 2;
  return s; // max 40
}

export function recomputeScore(
  b: Business,
  opts: { hasImage: boolean },
): { easy_auto_score: number; score_breakdown: ScoreBreakdown } {
  const completeness = completenessScore({ ...b, hasImage: opts.hasImage });
  const reputation = b.score_breakdown?.reputation ?? 0; // preserved from curate.mjs
  const trust = (b.claimed ? 10 : 0) + (b.featured ? 10 : 0);
  const total = Math.round(Math.max(0, Math.min(100, completeness + reputation + trust)));
  return {
    easy_auto_score: total,
    score_breakdown: {
      completeness,
      reputation,
      trust,
      bayesian_rating: b.score_breakdown?.bayesian_rating ?? null,
      penalised: b.score_breakdown?.penalised ?? false,
    },
  };
}
