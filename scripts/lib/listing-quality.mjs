// Listing quality classifier — shared by enrich-descriptions.mjs and scrap-thin.mjs.
//
// Splits the catalog into three tiers so we attack the "Crawled - currently not
// indexed" problem correctly:
//   good   — already has a real description; leave it.
//   enrich — thin/missing description BUT has something real to write from
//            (reputation, website, review keywords, or at least category+city).
//   scrap  — the dregs: no description, no reputation, no website, no keywords.
//            Nothing unique to say + almost certainly no search demand → noindex.

export function isValidWebsite(website) {
  return Boolean(website) && website !== "#";
}

export function descriptionLength(b) {
  return (b.description ?? "").trim().length;
}

export function hasReputation(b) {
  return b.rating != null && (b.google_reviews ?? 0) > 0;
}

export function hasKeywords(b) {
  return Boolean((b.review_keywords ?? "").trim());
}

// Tunable thresholds.
const THIN = 120; // chars — below this a listing reads as thin to Google
const EMPTY = 40; // chars — below this there's effectively no description

export function classify(b) {
  const len = descriptionLength(b);
  const reasons = [];

  const website = isValidWebsite(b.website);
  const rep = hasReputation(b);
  const kw = hasKeywords(b);

  // Scrap: no real content AND no trust signals AND no keywords to write from.
  if (len < EMPTY && !website && !rep && !kw) {
    reasons.push("no description", "no reputation", "no website", "no keywords");
    return { tier: "scrap", reasons, len };
  }

  if (len < THIN) {
    if (len === 0) reasons.push("no description");
    else reasons.push(`thin description (${len} chars)`);
    return { tier: "enrich", reasons, len };
  }

  return { tier: "good", reasons: ["has description"], len };
}

// Compact, factual inputs for the description prompt. Only real data — never
// anything the model could turn into a fabricated claim.
export function listingFacts(b) {
  const services = (b.review_keywords ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
  return {
    name: b.name,
    category: b.category_slug ?? null,
    city: b.city ?? null,
    address: b.address ?? null,
    rating: hasReputation(b) ? b.rating : null,
    reviews: hasReputation(b) ? b.google_reviews : null,
    website: isValidWebsite(b.website) ? b.website : null,
    hasHours: Boolean(b.hours),
    services,
  };
}
