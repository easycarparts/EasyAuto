// Small presentation helpers shared across components and pages.

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&#038;": "&",
  "&#38;": "&",
  "&quot;": '"',
  "&#34;": '"',
  "&apos;": "'",
  "&#039;": "'",
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&hellip;": "…",
  "&ndash;": "–",
  "&mdash;": "—",
};

// Category names in the WP export contain HTML entities (e.g. "Auto Repair &amp; Service").
export function decodeEntities(input: string): string {
  return input.replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m] ?? m);
}

// Format a 0–5 rating to one decimal (e.g. 4 -> "4.0").
export function formatRating(rating: number | null): string | null {
  if (rating == null) return null;
  return rating.toFixed(1);
}

// "1,073" style grouping for counts.
export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

// Turn a city name into a URL-safe slug (used for programmatic pages in Step 5).
export function citySlug(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// First sentence / trimmed blurb for meta descriptions and cards.
export function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

// Strip WordPress block comments and tags to get plain text (meta descriptions, excerpts).
export function stripHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Remove WordPress block-editor comments from stored post HTML before rendering.
export function cleanPostHtml(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "").trim();
}

// Normalise a UAE phone string to an international wa.me number (digits only).
// "+971 4 281 4512" -> "97142814512"; "055 206 5153" -> "971552065153".
export function whatsappNumber(phone: string | null): string | null {
  if (!phone) return null;
  let d = phone.replace(/[^\d+]/g, "");
  d = d.replace(/^00/, "").replace(/^\+/, "");
  if (d.startsWith("971")) return d;
  if (d.startsWith("0")) return `971${d.slice(1)}`;
  if (d.length >= 8 && d.length <= 10) return `971${d}`;
  return d || null;
}

// Opening hours come either as a plain string ("9 am-8 pm") or, for a couple of
// records, as raw PHP-serialized WordPress meta. Normalise to "Day: hours" lines.
export function parseHours(raw: string | null): string[] | null {
  if (!raw) return null;
  if (!/^a:\d+:\{/.test(raw)) return [raw.trim()];
  const out: string[] = [];
  const re = /s:3:"day";s:\d+:"([^"]*)";s:5:"hours";s:\d+:"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) out.push(`${m[1]}: ${m[2]}`);
  return out.length ? out : null;
}
