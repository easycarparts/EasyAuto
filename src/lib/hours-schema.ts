import { parseHours } from "./format";

const DAY_NAMES: Record<string, string> = {
  monday: "Monday",
  mon: "Monday",
  tuesday: "Tuesday",
  tue: "Tuesday",
  tues: "Tuesday",
  wednesday: "Wednesday",
  wed: "Wednesday",
  thursday: "Thursday",
  thu: "Thursday",
  thur: "Thursday",
  thurs: "Thursday",
  friday: "Friday",
  fri: "Friday",
  saturday: "Saturday",
  sat: "Saturday",
  sunday: "Sunday",
  sun: "Sunday",
};

function to24h(token: string): string | null {
  const m = token
    .trim()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = m[2] ?? "00";
  const meridiem = m[3]?.toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

/** Best-effort OpeningHoursSpecification from stored hours text. */
export function openingHoursSpecification(
  raw: string | null,
): Record<string, unknown>[] | null {
  const lines = parseHours(raw);
  if (!lines) return null;

  const specs: Record<string, unknown>[] = [];
  for (const line of lines) {
    const dayMatch = line.match(/^([A-Za-z]+)\s*:\s*(.+)$/);
    if (!dayMatch) continue;
    const day = DAY_NAMES[dayMatch[1].toLowerCase()];
    if (!day) continue;

    const range = dayMatch[2].match(
      /(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i,
    );
    if (!range) continue;
    const opens = to24h(range[1]);
    const closes = to24h(range[2]);
    if (!opens || !closes) continue;

    specs.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: day,
      opens,
      closes,
    });
  }

  return specs.length > 0 ? specs : null;
}

export function openingHoursStrings(raw: string | null): string[] | null {
  const lines = parseHours(raw);
  return lines && lines.length > 0 ? lines : null;
}
